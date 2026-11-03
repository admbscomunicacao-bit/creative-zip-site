import * as React from 'react'
import { EmailAPIError, sendLovableEmail } from '@lovable.dev/email-js'
import { WebhookError, verifyWebhookRequest } from '@lovable.dev/webhooks-js'
import { createFileRoute } from '@tanstack/react-router'
import { brandMailConfigured, sendBrandMail } from '@/lib/brand-mail.server'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'

// Configuration
const SITE_NAME = "Canal Transforma"
const ROOT_DOMAIN = "canaltransforma.com.br"

// Primary delivery: the brand mailbox at UOL Host (see @/lib/brand-mail.server).
// Fallback delivery: Lovable's sender on notify.canaltransforma.com.br.
// Used while UOL_SMTP_PASSWORD is not set, or if the UOL server fails.
const LOVABLE_SENDER_DOMAIN = `notify.${ROOT_DOMAIN}`
const LOVABLE_FROM = `${SITE_NAME} <noreply@${ROOT_DOMAIN}>`

type AuthEmailData = {
  action_type: string
  email: string
  token?: string
  new_email?: string
}

type AuthEmailPayload = {
  version: string
  type: 'auth'
  run_id?: string
  data: AuthEmailData
}

const emails: Record<string, { subject: string; render: (data: AuthEmailData) => React.ReactElement }> = {
  signup: {
    subject: 'Seu código de confirmação | Canal Transforma',
    render: (data) =>
      React.createElement(SignupEmail, { recipient: data.email, token: data.token ?? '' }),
  },
  invite: {
    subject: 'Convite para a área editorial | Canal Transforma',
    render: (data) => React.createElement(InviteEmail, { token: data.token ?? '' }),
  },
  magiclink: {
    subject: 'Seu código de acesso | Canal Transforma',
    render: (data) => React.createElement(MagicLinkEmail, { token: data.token ?? '' }),
  },
  recovery: {
    subject: 'Código para redefinir sua senha | Canal Transforma',
    render: (data) => React.createElement(RecoveryEmail, { token: data.token ?? '' }),
  },
  email_change: {
    subject: 'Confirme seu novo e-mail | Canal Transforma',
    render: (data) =>
      React.createElement(EmailChangeEmail, {
        newEmail: data.new_email ?? '',
        token: data.token ?? '',
      }),
  },
  reauthentication: {
    subject: 'Seu código de verificação | Canal Transforma',
    render: (data) => React.createElement(ReauthenticationEmail, { token: data.token ?? '' }),
  },
}

const WEBHOOK_ERROR_STATUS: Record<string, number> = {
  missing_secret: 401,
  missing_timestamp: 401,
  invalid_timestamp: 401,
  stale_timestamp: 401,
  invalid_signature: 401,
  body_too_large: 400,
  invalid_json: 400,
  invalid_payload: 400,
}

function parseAuthPayload(body: string): AuthEmailPayload {
  const payload = JSON.parse(body) as AuthEmailPayload
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.version !== 'string' ||
    payload.type !== 'auth' ||
    !payload.data ||
    typeof payload.data.action_type !== 'string' ||
    typeof payload.data.email !== 'string'
  ) {
    throw new Error('Invalid auth email webhook payload')
  }
  return payload
}

type Message = { to: string; subject: string; html: string; text: string }


async function handleAuthEmail(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } })
  }

  const apiKey = process.env['LOVABLE_API_KEY']
  if (!apiKey) {
    return Response.json({ error: 'Email not configured' }, { status: 500 })
  }

  // Only the Lovable auth service may ask us to send login codes.
  let event: AuthEmailPayload
  try {
    ;({ payload: event } = await verifyWebhookRequest({ req: request, secret: apiKey, parser: parseAuthPayload }))
  } catch (error) {
    if (error instanceof WebhookError) {
      return Response.json({ error: error.message }, { status: WEBHOOK_ERROR_STATUS[error.code] ?? 401 })
    }
    console.error('[auth-email] webhook verification failed:', error)
    return Response.json({ error: 'Webhook verification failed' }, { status: 500 })
  }

  if (!event.run_id) return Response.json({ error: 'Missing run_id' }, { status: 400 })
  if (event.version !== '1') {
    return Response.json({ error: `Unsupported payload version: ${event.version}` }, { status: 400 })
  }

  const actionType = event.data.action_type
  const definition = Object.prototype.hasOwnProperty.call(emails, actionType) ? emails[actionType] : undefined
  if (!definition) {
    return Response.json({ error: `Unknown auth email action type: ${actionType}` }, { status: 400 })
  }

  const { render } = await import('@react-email/render')
  const element = definition.render(event.data)
  const message: Message = {
    to: event.data.email,
    subject: definition.subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
  }

  if (brandMailConfigured()) {
    try {
      await sendBrandMail(message)
      return Response.json({ success: true, sent: true, via: 'uol' })
    } catch (error) {
      console.error('[auth-email] UOL SMTP failed, falling back to Lovable sender:', error)
    }
  }

  try {
    await sendLovableEmail(
      {
        run_id: event.run_id,
        to: message.to,
        from: LOVABLE_FROM,
        sender_domain: LOVABLE_SENDER_DOMAIN,
        subject: message.subject,
        html: message.html,
        text: message.text,
        purpose: 'transactional',
        label: actionType,
      },
      { apiKey, sendUrl: process.env['LOVABLE_SEND_URL'] },
    )
  } catch (error) {
    console.error('[auth-email] Lovable send failed:', error)
    if (error instanceof EmailAPIError && !error.retryable) {
      return Response.json({ error: 'Email send rejected' }, { status: 400 })
    }
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }
  return Response.json({ success: true, sent: true, via: 'lovable' })
}

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handleAuthEmail(request),
    },
  },
})
