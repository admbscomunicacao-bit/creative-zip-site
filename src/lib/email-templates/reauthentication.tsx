import * as React from 'react'

import { CodeEmail } from './code-email'

interface ReauthenticationEmailProps {
  token?: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <CodeEmail
    preview={`Seu código de verificação: ${token ?? ''}`}
    title="Código de verificação"
    intro="Use o código abaixo para confirmar esta ação na área editorial do Canal Transforma."
    code={token ?? ''}
  />
)

export default ReauthenticationEmail
