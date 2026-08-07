import * as React from 'react'

import { CodeEmail } from './code-email'

interface SignupEmailProps {
  siteName?: string
  siteUrl?: string
  recipient?: string
  confirmationUrl?: string
  token?: string
}

export const SignupEmail = ({ recipient, token }: SignupEmailProps) => (
  <CodeEmail
    preview={`Seu código de verificação do Canal Transforma: ${token ?? ''}`}
    title="Confirme seu e-mail"
    intro={
      <>
        Recebemos um cadastro na área editorial do Canal Transforma
        {recipient ? ` com o e-mail ${recipient}` : ''}. Use o código abaixo para
        confirmar seu endereço de e-mail.
      </>
    }
    code={token ?? ''}
    note="Depois da confirmação, sua conta ficará aguardando aprovação de um administrador."
  />
)

export default SignupEmail
