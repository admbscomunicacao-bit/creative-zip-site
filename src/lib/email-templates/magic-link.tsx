import * as React from 'react'

import { CodeEmail } from './code-email'

interface MagicLinkEmailProps {
  siteName?: string
  confirmationUrl?: string
  token?: string
}

export const MagicLinkEmail = ({ token }: MagicLinkEmailProps) => (
  <CodeEmail
    preview={`Seu código de acesso ao Canal Transforma: ${token ?? ''}`}
    title="Seu código de acesso"
    intro="Use o código abaixo para entrar na área editorial do Canal Transforma."
    code={token ?? ''}
  />
)

export default MagicLinkEmail
