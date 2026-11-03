// Código de login de 6 dígitos gerado e conferido pelo próprio site (só servidor).
// O código em si nunca é guardado: o audit_log recebe só um HMAC dele, assinado com
// um segredo do servidor, então nem quem lê o audit_log consegue descobrir o código.

export const LOGIN_CODE_DIGITS = 6;
export const LOGIN_CODE_TTL_MINUTES = 60; // o e-mail diz "cerca de 1 hora"

/** Seis dígitos aleatórios e uniformes (000000 a 999999). */
export function generateLoginCode(): string {
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0]!;
    if (value < limit) return String(value % 1_000_000).padStart(LOGIN_CODE_DIGITS, "0");
  }
}

function signingKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Chave do servidor ausente.");
  return key;
}

/** HMAC-SHA256 do código, amarrado à conta. */
export async function signLoginCode(userId: string, code: string): Promise<string> {
  return signCode("editorial-login-code", userId, code);
}

/** Mesmo HMAC, com finalidade separada (código de cadastro não vale para senha e vice-versa). */
export async function signCode(purpose: string, userId: string, code: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${purpose}:${userId}:${code}`),
  );
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparação em tempo constante. */
export function sameSignature(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
