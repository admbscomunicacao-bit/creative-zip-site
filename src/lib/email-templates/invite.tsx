import * as React from 'react'

import { CodeEmail } from './code-email'

interface InviteEmailProps {
  siteName?: string
  siteUrl?: string
  confirmationUrl?: string
  token?: string
}

export const InviteEmail = ({ token }: InviteEmailProps) => (
  <CodeEmail
    preview={`Seu código de convite: ${token ?? ''}`}
    title="Você foi convidado"
    intro="Você recebeu um convite para participar da área editorial do Canal Transforma. Use o código abaixo para ativar seu acesso."
    code={token ?? ''}
  />
)

export default InviteEmail
