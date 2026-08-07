import * as React from 'react'
import { createAuthEmailHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'

// Configuration
const SITE_NAME = "Canal Transforma"
const SENDER_DOMAIN = "notify.canaltransforma.com.br"
const ROOT_DOMAIN = "canaltransforma.com.br"
const FROM_DOMAIN = "canaltransforma.com.br"
const SITE_URL = `https://${ROOT_DOMAIN}`

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
const handler = createAuthEmailHandler({
  apiKey: process.env['LOVABLE_API_KEY']!,
  from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
  senderDomain: SENDER_DOMAIN,
  sendUrl: process.env['LOVABLE_SEND_URL'],
  emails: {
    signup: {
      subject: 'Seu código de confirmação — Canal Transforma',
      render: (data) =>
        React.createElement(SignupEmail, {
          recipient: data.email,
          token: data.token ?? '',
        }),
    },
    invite: {
      subject: 'Convite para a área editorial — Canal Transforma',
      render: (data) =>
        React.createElement(InviteEmail, { token: data.token ?? '' }),
    },
    magiclink: {
      subject: 'Seu código de acesso — Canal Transforma',
      render: (data) =>
        React.createElement(MagicLinkEmail, { token: data.token ?? '' }),
    },
    recovery: {
      subject: 'Código para redefinir sua senha — Canal Transforma',
      render: (data) =>
        React.createElement(RecoveryEmail, { token: data.token ?? '' }),
    },
    email_change: {
      subject: 'Confirme seu novo e-mail — Canal Transforma',
      render: (data) =>
        React.createElement(EmailChangeEmail, {
          newEmail: data.new_email ?? '',
          token: data.token ?? '',
        }),
    },
    reauthentication: {
      subject: 'Seu código de verificação — Canal Transforma',
      render: (data) =>
        React.createElement(ReauthenticationEmail, { token: data.token ?? '' }),
    },
  },
}),
    },
  },
})

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handler(request),
    },
  },
})
