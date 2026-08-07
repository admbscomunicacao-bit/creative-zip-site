import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { EditorialShell } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, friendlyAuthError } from "@/lib/editorial-auth";
import { clearPendingSignup, getPendingSignup } from "@/lib/editorial-signup-store";
import { ensureEditorialProfile, updateMyEditorialProfile } from "@/lib/editorial.functions";


type Search = { email?: string | undefined };

export const Route = createFileRoute("/editorial/confirmar-email")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    email: typeof search["email"] === "string" ? search["email"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Confirme seu e-mail — Canal Transforma" },
      {
        name: "description",
        content:
          "Digite o código de seis dígitos enviado para o seu e-mail e confirme sua conta editorial.",
      },
      { property: "og:title", content: "Confirme seu e-mail — Canal Transforma" },
      {
        property: "og:description",
        content: "Validação de e-mail da área editorial do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfirmEmail,
});

function ConfirmEmail() {
  const { email: initialEmail } = Route.useSearch();
  const navigate = useNavigate();
  const ensureProfile = useServerFn(ensureEditorialProfile);
  const updateProfile = useServerFn(updateMyEditorialProfile);

  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingEmail, setEditingEmail] = useState(!initialEmail);

  // Salva os dados preenchidos no cadastro (foto, biografia) agora que existe sessão.
  const savePendingSignupData = async (userId: string) => {
    const pending = getPendingSignup();
    if (!pending) return;
    let avatarPath = "";
    if (pending.avatarFile) {
      const ext = pending.avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, pending.avatarFile, {
          contentType: pending.avatarFile.type,
          upsert: true,
        });
      if (!upErr) avatarPath = path;
    }
    await updateProfile({
      data: {
        fullName: pending.fullName,
        phone: pending.phone,
        bio: pending.bio,
        avatarPath,
      },
    }).catch(() => undefined);
    clearPendingSignup();
  };

  // If the user arrived through the e-mail link, the session already exists.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      await ensureProfile({ data: { acceptedTerms: true } }).catch(() => undefined);
      await savePendingSignupData(data.session.user.id);
      await navigate({ to: "/editorial/aguardando" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureProfile, navigate]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (code.trim().length !== 6) {
      setError("O código tem seis dígitos.");
      return;
    }
    setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: parsedEmail.data,
        token: code.trim(),
        type: "signup",
      });
      if (verifyError) {
        const retry = await supabase.auth.verifyOtp({
          email: parsedEmail.data,
          token: code.trim(),
          type: "email",
        });
        if (retry.error) {
          setError(friendlyAuthError(verifyError.message));
          return;
        }
      }
      const user = await supabase.auth.getUser();
      const meta = (user.data.user?.user_metadata ?? {}) as { full_name?: string; phone?: string };
      await ensureProfile({
        data: {
          fullName: meta.full_name ?? "",
          phone: meta.phone ?? "",
          acceptedTerms: true,
        },
      });
      if (user.data.user?.id) await savePendingSignupData(user.data.user.id);
      await navigate({ to: "/editorial/aguardando" });
    } finally {

      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setInfo("");
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setError("Informe um e-mail válido para reenviar o código.");
      return;
    }
    setBusy(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: parsedEmail.data,
        options: { emailRedirectTo: `${window.location.origin}/editorial/confirmar-email` },
      });
      if (resendError) {
        setError(friendlyAuthError(resendError.message));
        return;
      }
      setInfo("Novo código enviado. Confira sua caixa de entrada e o spam.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Confirme seu e-mail"
      intro={`Enviamos um código de seis dígitos para ${email || "o e-mail informado"}. O código expira em 60 minutos.`}
      backTo="/editorial"
      backLabel="← Voltar para o login"
    >
      <form className="login-form" onSubmit={verify}>
        {editingEmail ? (
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@canaltransforma.com.br"
              required
            />
          </label>
        ) : (
          <p className="password-hint">
            E-mail: <strong>{email}</strong>{" "}
            <button
              type="button"
              className="editorial-link-button"
              onClick={() => setEditingEmail(true)}
            >
              corrigir e-mail
            </button>
          </p>
        )}
        <label>
          Código de seis dígitos
          <input
            className="otp-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
        </label>
        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? "Verificando..." : "Verificar código"} <b>→</b>
        </button>
        <button type="button" className="editorial-secondary" onClick={resend} disabled={busy}>
          Reenviar código
        </button>
        {info && <p className="login-message">{info}</p>}
        {error && <p className="login-message login-error">{error}</p>}
        <p className="password-hint">
          O código expira por segurança. Se ele vencer, use “Reenviar código”. Se você recebeu um
          link de confirmação, clicar nele também valida sua conta.
        </p>
        <div className="editorial-links">
          <Link to="/editorial/criar-conta">Voltar ao cadastro</Link>
        </div>
      </form>
    </EditorialShell>
  );
}
