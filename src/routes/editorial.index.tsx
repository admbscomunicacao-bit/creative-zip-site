import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { EditorialShell, nextEditorialStep } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, friendlyAuthError, statusMessage } from "@/lib/editorial-auth";
import {
  getMyEditorialAccount,
  recordAuthEvent,
  recordLoginFailure,
  type EditorialAccount,
} from "@/lib/editorial.functions";

export const Route = createFileRoute("/editorial/")({
  head: () => ({
    meta: [
      { title: "Área editorial — Canal Transforma" },
      {
        name: "description",
        content: "Acesso restrito da redação do Canal Transforma: entre com seu e-mail e senha.",
      },
      { property: "og:title", content: "Área editorial — Canal Transforma" },
      {
        property: "og:description",
        content: "Entre com suas credenciais para acessar a redação do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditorialLogin,
});

function EditorialLogin() {
  const navigate = useNavigate();
  const fetchAccount = useServerFn(getMyEditorialAccount);
  const logEvent = useServerFn(recordAuthEvent);
  const logFailure = useServerFn(recordLoginFailure);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "code">("password");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const goToAccount = async (account: EditorialAccount | null) => {
    if (!account) {
      await navigate({ to: "/editorial/confirmar-email", search: { email } });
      return;
    }
    if (account.status === "blocked") {
      setError(statusMessage("blocked"));
      await supabase.auth.signOut();
      return;
    }
    await navigate({ to: nextEditorialStep(account) });
  };

  const sendLoginCode = async (address: string) => {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: false },
    });
    return otpError?.message ?? "";
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setError(parsedEmail.error.issues[0]?.message ?? "E-mail inválido");
      return;
    }
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsedEmail.data,
        password,
      });
      if (signInError) {
        await logFailure({ data: { email: parsedEmail.data, reason: signInError.message } }).catch(
          () => undefined,
        );
        setError(friendlyAuthError(signInError.message));
        return;
      }
      // Senha confere: encerramos a sessão e exigimos o código enviado por e-mail.
      await supabase.auth.signOut();
      const otpError = await sendLoginCode(parsedEmail.data);
      if (otpError) {
        setError(friendlyAuthError(otpError));
        return;
      }
      setStep("code");
      setPassword("");
      setInfo(`Enviamos um código de seis dígitos para ${parsedEmail.data}.`);
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setError("E-mail inválido.");
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
        type: "email",
      });
      if (verifyError) {
        setError(friendlyAuthError(verifyError.message));
        return;
      }
      await logEvent({ data: { action: "login_success" } }).catch(() => undefined);
      const account = (await fetchAccount()) as EditorialAccount | null;
      await goToAccount(account);
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const otpError = await sendLoginCode(email);
      if (otpError) setError(friendlyAuthError(otpError));
      else setInfo("Novo código enviado. Confira sua caixa de entrada e o spam.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Login da redação Canal Transforma"
      intro={
        step === "password"
          ? "Entre com sua conta individual para criar, revisar e administrar as publicações do Canal Transforma."
          : "Verificação em duas etapas: digite o código de seis dígitos que enviamos para o seu e-mail."
      }
    >
      {step === "password" ? (
        <form className="login-form" onSubmit={submitPassword}>
          <label>
            E-mail
            <input
              type="email"
              placeholder="seuemail@canaltransforma.com.br"
              required
              name="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              placeholder="Digite sua senha"
              required
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </label>
          <button className="login-submit" type="submit" disabled={busy}>
            {busy ? "Entrando..." : "Entrar"} <b>→</b>
          </button>
          {info && <p className="login-message">{info}</p>}
          {error && <p className="login-message login-error">{error}</p>}
          <div className="editorial-links">
            <Link to="/editorial/criar-conta">Criar conta</Link>
            <Link to="/editorial/esqueci-senha">Esqueci minha senha</Link>
          </div>
        </form>
      ) : (
        <form className="login-form" onSubmit={submitCode}>
          <p className="password-hint">
            E-mail: <strong>{email}</strong>
          </p>
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
              onChange={(ev) => setCode(ev.target.value.replace(/\D/g, ""))}
              required
            />
          </label>
          <button className="login-submit" type="submit" disabled={busy}>
            {busy ? "Verificando..." : "Confirmar código"} <b>→</b>
          </button>
          <button type="button" className="editorial-secondary" onClick={resendCode} disabled={busy}>
            Reenviar código
          </button>
          {info && <p className="login-message">{info}</p>}
          {error && <p className="login-message login-error">{error}</p>}
          <button
            type="button"
            className="editorial-link-button"
            onClick={() => {
              setStep("password");
              setCode("");
              setError("");
              setInfo("");
            }}
          >
            ← Usar outro e-mail
          </button>
        </form>
      )}
    </EditorialShell>
  );
}

