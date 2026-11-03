// Cadastro e recuperação de senha com código de 6 dígitos enviado pelo contato@ (UOL).
// O código nunca é guardado: o audit_log recebe só a assinatura HMAC dele.
// Sem a senha da UOL configurada, as telas voltam ao fluxo padrão do sistema de login.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { emailSchema, passwordSchema } from "@/lib/editorial-auth";

const CODE_TTL_MINUTES = 60;
const RESEND_SECONDS = 60;
const MAX_SENDS_15_MIN = 5;
const MAX_FAILS_15_MIN = 5;

type Purpose = "signup" | "reset";
const SENT: Record<Purpose, string> = { signup: "signup_code_sent", reset: "reset_code_sent" };
const FAILED: Record<Purpose, string> = {
  signup: "signup_code_failed",
  reset: "reset_code_failed",
};
const USED: Record<Purpose, string> = { signup: "signup_confirmed", reset: "password_reset_done" };

async function tools() {
  const [{ supabaseAdmin }, mail, codes] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("@/lib/brand-mail.server"),
    import("@/lib/login-code.server"),
  ]);
  return { db: supabaseAdmin, mail, codes };
}

// Limite por IP (por instância do servidor): evita usar o formulário para disparar e-mails.
const hitsByIp = new Map<string, number[]>();
async function limitByIp(bucket: string, max: number, minutes: number) {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "?";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const hits = (hitsByIp.get(key) ?? []).filter((t) => now - t < minutes * 60_000);
  if (hits.length >= max) throw new Error("Muitas tentativas seguidas. Aguarde alguns minutos.");
  hitsByIp.set(key, [...hits, now]);
}

const since = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/** Gera, registra e envia um código. Respeita 1 envio por minuto e 5 a cada 15 min. */
async function sendCode(purpose: Purpose, userId: string, email: string, name: string) {
  const { db, mail, codes } = await tools();
  const { data: recent } = await db
    .from("audit_log")
    .select("created_at")
    .eq("actor_id", userId)
    .eq("action", SENT[purpose])
    .gte("created_at", since(15))
    .order("created_at", { ascending: false });
  const sent = recent ?? [];
  if (sent[0] && Date.now() - new Date(sent[0].created_at).getTime() < RESEND_SECONDS * 1000) {
    return; // o código enviado há menos de 1 minuto continua valendo
  }
  if (sent.length >= MAX_SENDS_15_MIN) {
    throw new Error("Muitos códigos pedidos. Aguarde 15 minutos e tente de novo.");
  }

  const code = codes.generateLoginCode();
  const signature = await codes.signCode(`editorial-${purpose}-code`, userId, code);
  const { error } = await db.from("audit_log").insert({
    actor_id: userId,
    target_user_id: userId,
    action: SENT[purpose],
    detail: { signature, email },
  });
  if (error) throw new Error("Não foi possível gerar o código. Tente de novo.");

  const React = await import("react");
  const element =
    purpose === "signup"
      ? React.createElement((await import("@/lib/email-templates/signup")).SignupEmail, {
          recipient: email,
          token: code,
        })
      : React.createElement((await import("@/lib/email-templates/recovery")).RecoveryEmail, {
          token: code,
        });
  const subject =
    purpose === "signup"
      ? "Seu código de confirmação | Canal Transforma"
      : "Código para redefinir sua senha | Canal Transforma";
  await mail.sendBrandMail(await mail.renderBrandMessage(email, subject, element));
  void name;
}

/** Confere o último código enviado para a conta (uma vez só, dentro do prazo). */
async function checkCode(purpose: Purpose, userId: string, code: string) {
  const { db, codes } = await tools();
  const { count: fails } = await db
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", userId)
    .eq("action", FAILED[purpose])
    .gte("created_at", since(15));
  if ((fails ?? 0) >= MAX_FAILS_15_MIN) {
    throw new Error("Muitas tentativas com código errado. Aguarde 15 minutos.");
  }
  const { data: last } = await db
    .from("audit_log")
    .select("created_at,detail")
    .eq("actor_id", userId)
    .eq("action", SENT[purpose])
    .gte("created_at", since(CODE_TTL_MINUTES))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const expected =
    last?.detail && typeof last.detail === "object" && !Array.isArray(last.detail)
      ? (last.detail as Record<string, unknown>)["signature"]
      : undefined;
  let ok = false;
  if (last && typeof expected === "string") {
    const { count: used } = await db
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", userId)
      .eq("action", USED[purpose])
      .gte("created_at", last.created_at);
    const typed = await codes.signCode(`editorial-${purpose}-code`, userId, code);
    ok = (used ?? 0) === 0 && codes.sameSignature(typed, expected);
  }
  if (!ok) {
    await db.from("audit_log").insert({
      actor_id: userId,
      target_user_id: userId,
      action: FAILED[purpose],
      detail: {},
    });
    throw new Error(
      "Código incorreto ou expirado. Confira o último e-mail ou peça um novo código.",
    );
  }
}

/** Conta criada pelo cadastro e ainda não confirmada: procura pelo e-mail do último código. */
async function pendingSignupUser(email: string) {
  const { db } = await tools();
  const { data } = await db
    .from("audit_log")
    .select("actor_id")
    .eq("action", SENT.signup)
    .eq("detail->>email", email)
    .gte("created_at", since(24 * 60))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.actor_id ?? null;
}

const codeField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "O código tem seis dígitos.");

/** Diz às telas se o envio pela caixa da marca está ligado. */
export const brandCodesEnabled = createServerFn({ method: "GET" }).handler(async () => {
  const { mail } = await tools();
  return mail.brandMailConfigured();
});

/* ── Cadastro ── */

const signupInput = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().max(40).default(""),
});

export const startEditorialSignup = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof signupInput>) => signupInput.parse(input))
  .handler(async ({ data }) => {
    await limitByIp("signup", 5, 60);
    const { db } = await tools();
    const email = data.email.toLowerCase();
    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: false,
      user_metadata: { full_name: data.fullName, phone: data.phone, terms_accepted: true },
    });
    let userId = created?.user?.id ?? null;
    if (error) {
      // E-mail já usado: se for um cadastro nosso ainda não confirmado, reenvia o código.
      const pendingId = await pendingSignupUser(email);
      if (!pendingId) throw new Error("Já existe uma conta com este e-mail.");
      const { data: existing } = await db.auth.admin.getUserById(pendingId);
      if (existing?.user?.email_confirmed_at)
        throw new Error("Já existe uma conta com este e-mail.");
      userId = pendingId;
    }
    if (!userId) throw new Error("Não foi possível criar a conta. Tente de novo.");
    await sendCode("signup", userId, email, data.fullName);
    return { ok: true };
  });

export const resendSignupCode = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => z.object({ email: emailSchema }).parse(input))
  .handler(async ({ data }) => {
    await limitByIp("resend", 10, 15);
    const email = data.email.toLowerCase();
    const userId = await pendingSignupUser(email);
    if (userId) await sendCode("signup", userId, email, "");
    return { ok: true };
  });

export const confirmEditorialSignup = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string }) =>
    z.object({ email: emailSchema, code: codeField }).parse(input),
  )
  .handler(async ({ data }) => {
    await limitByIp("confirm", 20, 15);
    const { db, mail } = await tools();
    const email = data.email.toLowerCase();
    const userId = await pendingSignupUser(email);
    if (!userId) throw new Error("Código incorreto ou expirado. Faça o cadastro de novo.");
    await checkCode("signup", userId, data.code);

    const { data: found } = await db.auth.admin.getUserById(userId);
    const meta = (found?.user?.user_metadata ?? {}) as { full_name?: string; phone?: string };
    await db.auth.admin.updateUserById(userId, { email_confirm: true });

    // Perfil "aguardando aprovação" e papel de repórter, como no fluxo anterior.
    const { data: existing } = await db
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!existing) {
      await db.from("profiles").insert({
        id: userId,
        email,
        full_name: meta.full_name ?? "",
        phone: meta.phone || null,
        terms_accepted_at: new Date().toISOString(),
      });
      await db
        .from("user_roles")
        .upsert({ user_id: userId, role: "reporter" }, { onConflict: "user_id,role" });
    }
    await db.from("audit_log").insert({
      actor_id: userId,
      target_user_id: userId,
      action: USED.signup,
      detail: { email },
    });

    // Aviso para a redação aprovar o cadastro.
    const name = meta.full_name || email;
    await mail
      .sendBrandMail({
        to: mail.NEWSROOM_INBOX,
        subject: `Novo cadastro na redação: ${name}`,
        text: `${name} (${email}) criou uma conta na área editorial e está aguardando aprovação.\n\nAprovar ou bloquear: https://canaltransforma.com.br/editorial/usuarios`,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5"><p><b>${name.replace(/[<>&]/g, "")}</b> (${email}) criou uma conta na área editorial e está aguardando aprovação.</p><p><a href="https://canaltransforma.com.br/editorial/usuarios">Aprovar ou bloquear no painel</a></p></div>`,
      })
      .catch((error) => console.error("[signup] aviso à redação falhou:", error));

    return { ok: true };
  });

/* ── Recuperação de senha ── */

/** Sempre responde "ok": não revela se o e-mail tem conta. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => z.object({ email: emailSchema }).parse(input))
  .handler(async ({ data }) => {
    await limitByIp("reset", 8, 15);
    const { db } = await tools();
    const email = data.email.toLowerCase();
    const { data: profile } = await db
      .from("profiles")
      .select("id,full_name,status")
      .eq("email", email)
      .maybeSingle();
    if (profile && profile.status !== "blocked") {
      try {
        await sendCode("reset", profile.id, email, profile.full_name ?? "");
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Muitos")) throw error;
        console.error("[reset] envio falhou:", error);
      }
    }
    return { ok: true };
  });

export const resetPasswordWithCode = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string; password: string }) =>
    z.object({ email: emailSchema, code: codeField, password: passwordSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    await limitByIp("reset-check", 20, 15);
    const { db } = await tools();
    const email = data.email.toLowerCase();
    const { data: profile } = await db
      .from("profiles")
      .select("id,status")
      .eq("email", email)
      .maybeSingle();
    if (!profile || profile.status === "blocked") {
      throw new Error(
        "Código incorreto ou expirado. Confira o último e-mail ou peça um novo código.",
      );
    }
    await checkCode("reset", profile.id, data.code);
    const { error } = await db.auth.admin.updateUserById(profile.id, { password: data.password });
    if (error) throw new Error("Não foi possível trocar a senha. Tente de novo.");
    await db.from("audit_log").insert({
      actor_id: profile.id,
      target_user_id: profile.id,
      action: USED.reset,
      detail: {},
    });
    return { ok: true };
  });
