import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres")
  .regex(/[a-z]/, "Inclua pelo menos uma letra minúscula")
  .regex(/[A-Z]/, "Inclua pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "Inclua pelo menos um número")
  .regex(/[^A-Za-z0-9]/, "Inclua pelo menos um símbolo");

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail")
  .email("Informe um e-mail válido")
  .max(255);

/** Celular brasileiro com DDD: 11 dígitos, ex. (17) 99999-9999. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Informe seu telefone celular")
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 11, "Informe um celular com DDD e 9 dígitos, ex. (17) 99999-9999")
  .refine((v) => v[2] === "9", "O número do celular deve começar com 9 depois do DDD");

/** Aplica a máscara (99) 99999-9999 conforme o usuário digita. */
export function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Formato internacional guardado no perfil: +55DDDNÚMERO. */
export function toE164BR(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? `+55${digits}` : "";
}

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(3, "Informe seu nome completo").max(120),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    phone: phoneSchema,
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "É necessário aceitar os termos e a política de privacidade" }),
    }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem",
  });

export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Já existe uma conta com este e-mail.";
  if (m.includes("pwned") || m.includes("weak"))
    return "Esta senha aparece em vazamentos conhecidos. Escolha outra.";
  if (m.includes("expired") || (m.includes("token") && m.includes("invalid")))
    return "Código inválido ou expirado. Solicite um novo código.";
  if (m.includes("invalid") && m.includes("token")) return "Código inválido. Verifique e tente novamente.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  return message;
}

export function statusMessage(status: string): string {
  if (status === "pending")
    return "Sua conta está aguardando aprovação de um administrador. Você pode editar seu perfil enquanto aguarda.";
  if (status === "blocked")
    return "Sua conta foi bloqueada. Fale com um administrador do Canal Transforma.";
  return "";
}
