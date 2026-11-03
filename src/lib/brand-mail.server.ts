// Envio de e-mail pela caixa contato@canaltransforma.com.br (UOL Host / Suite UOL).
// Só roda no servidor. A senha fica apenas no secret UOL_SMTP_PASSWORD do Lovable Cloud.
import type * as React from "react";

const SITE_NAME = "Canal Transforma";
const SMTP_HOST = "smtp.suite.uol";
// 465 = conexão já criptografada desde o primeiro byte (TLS implícito).
// Na 587 (STARTTLS) um intermediário poderia apagar o aviso de TLS e a senha iria aberta.
const SMTP_PORT = 465;
const SMTP_USER = "contato@canaltransforma.com.br";

export type BrandMessage = { to: string; subject: string; html: string; text: string };

export function brandMailConfigured(): boolean {
  return Boolean(process.env["UOL_SMTP_PASSWORD"]);
}

export async function renderBrandMessage(
  to: string,
  subject: string,
  element: React.ReactElement,
): Promise<BrandMessage> {
  const { render } = await import("@react-email/render");
  return {
    to,
    subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}

export async function sendBrandMail(message: BrandMessage): Promise<void> {
  const password = process.env["UOL_SMTP_PASSWORD"];
  if (!password) throw new Error("UOL_SMTP_PASSWORD não configurado.");
  const { WorkerMailer } = await import("worker-mailer");
  await WorkerMailer.send(
    {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      credentials: { username: SMTP_USER, password },
      authType: ["plain", "login"],
      socketTimeoutMs: 15_000,
      responseTimeoutMs: 15_000,
    },
    { from: { name: SITE_NAME, email: SMTP_USER }, ...message },
  );
}
