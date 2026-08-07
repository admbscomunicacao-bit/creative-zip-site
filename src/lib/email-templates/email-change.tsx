import * as React from 'react'

import { CodeEmail } from './code-email'

interface EmailChangeEmailProps {
  siteName?: string
  oldEmail?: string
  email?: string
  newEmail?: string
  confirmationUrl?: string
  token?: string
}

export const EmailChangeEmail = ({ newEmail, token }: EmailChangeEmailProps) => (
  <CodeEmail
    preview={`Código para confirmar seu novo e-mail: ${token ?? ''}`}
    title="Confirme seu novo e-mail"
    intro={
      <>
        Foi solicitada a troca do e-mail da sua conta do Canal Transforma
        {newEmail ? ` para ${newEmail}` : ''}. Use o código abaixo para confirmar a
        alteração.
      </>
    }
    code={token ?? ''}
  />
)

export default EmailChangeEmail
