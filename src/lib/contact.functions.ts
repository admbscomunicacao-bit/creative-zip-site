import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactInput = z.object({
  name: z.string().trim().min(2, "Diga seu nome.").max(120),
  email: z.string().trim().email("Confira o e-mail.").max(160),
  phone: z.string().trim().max(40).default(""),
  subject: z.enum(["pauta", "correcao", "outro"]),
  message: z.string().trim().min(15, "Conte um pouco mais (mínimo 15 caracteres).").max(4000),
  /** Campo invisível: pessoas deixam vazio, robôs preenchem. */
  website: z.string().max(0).default(""),
  /** Momento em que o formulário abriu: envio em menos de 3 s é robô. */
  openedAt: z.number().int(),
});

const subjectLabel = {
  pauta: "Sugestão de pauta",
  correcao: "Pedido de correção",
  outro: "Contato",
};

const escapeHtml = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

// Limite simples por instância: no máximo 5 mensagens a cada 10 minutos por IP.
const recent = new Map<string, number[]>();

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof contactInput>) => contactInput.parse(input))
  .handler(async ({ data }) => {
    if (data.website || Date.now() - data.openedAt < 3000) return { ok: true };

    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "?";
    const now = Date.now();
    const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
    if (hits.length >= 5)
      throw new Error("Muitas mensagens seguidas. Tente de novo em alguns minutos.");
    recent.set(ip, [...hits, now]);

    const mail = await import("@/lib/brand-mail.server");
    if (!mail.brandMailConfigured()) {
      throw new Error("O formulário está fora do ar. Escreva para contato@canaltransforma.com.br.");
    }
    const label = subjectLabel[data.subject];
    const lines = [
      `${label} enviada pelo portal`,
      "",
      `Nome: ${data.name}`,
      `E-mail: ${data.email}`,
      data.phone ? `Telefone/WhatsApp: ${data.phone}` : "",
      "",
      data.message,
    ].filter((l, i, all) => l !== "" || all[i - 1] !== "");
    await mail.sendBrandMail({
      to: mail.NEWSROOM_INBOX,
      reply: data.email,
      subject: `[Portal] ${label}: ${data.name}`,
      text: lines.join("\n"),
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">${lines
        .map((l) => (l ? `<p style="margin:0 0 6px">${escapeHtml(l)}</p>` : "<br>"))
        .join("")}</div>`,
    });
    return { ok: true };
  });
