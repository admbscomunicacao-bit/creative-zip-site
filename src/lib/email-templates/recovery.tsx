import * as React from 'react'

import { CodeEmail } from './code-email'

interface RecoveryEmailProps {
  siteName?: string
  confirmationUrl?: string
  token?: string
}

export const RecoveryEmail = ({ token }: RecoveryEmailProps) => (
  <CodeEmail
    preview={`Código para redefinir sua senha: ${token ?? ''}`}
    title="Redefinir sua senha"
    intro="Recebemos um pedido para redefinir a senha da sua conta na área editorial do Canal Transforma. Use o código abaixo para continuar."
    code={token ?? ''}
  />
)

export default RecoveryEmail
