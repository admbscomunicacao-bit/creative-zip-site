import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { EditorialShell, nextEditorialStep } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, friendlyAuthError, statusMessage } from "@/lib/editorial-auth";
import {
  getMyEditorialAccount,
  recordLoginFailure,
  sendEditorialLoginCode,
  verifyEditorialLoginCode,
  type EditorialAccount,
} from "@/lib/editorial.functions";

export const Route = createFileRoute("/editorial/")({
  head: () => ({
    meta: [
      { title: "Área editorial | Canal Transforma" },
      {
        name: "description",
        content: "Acesso restrito da redação do Canal Transforma: entre com seu e-mail e senha.",
      },
      { property: "og:title", content: "Área editorial | Canal Transforma" },
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
  const logFailure = useServerFn(recordLoginFailure);
  const requestCode = useServerFn(sendEditorialLoginCode);
  const checkCode = useServerFn(verifyEditorialLoginCode);

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

  // O código é pedido pelo servidor, preso à sessão aberta com a senha.
  const sendLoginCode = async () => {
    try {
      await requestCode();
      return "";
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
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
      // Senha confere: a sessão fica aberta, mas o banco só libera a redação
      // depois que o código do e-mail for confirmado para ela.
      const otpError = await sendLoginCode();
      if (otpError) {
        setError(friendlyAuthError(otpError));
        return;
      }
      setStep("code");
      setPassword("");
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
      await checkCode({ data: { code: code.trim() } });
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
      const otpError = await sendLoginCode();
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
          : "Falta só confirmar que é você."
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
        <form className="login-form code-form" onSubmit={submitCode}>
          <p className="code-sent">
            Enviamos um código para <strong>{email}</strong>
          </p>
          <label>
            Código de 6 dígitos
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
              autoFocus
            />
          </label>
          <button className="login-submit" type="submit" disabled={busy}>
            {busy ? "Verificando..." : "Confirmar código"} <b>→</b>
          </button>
          {info && <p className="login-message">{info}</p>}
          {error && <p className="login-message login-error">{error}</p>}
          <div className="code-actions">
            <button
              type="button"
              className="editorial-link-button"
              onClick={resendCode}
              disabled={busy}
            >
              Reenviar código
            </button>
            <button
              type="button"
              className="editorial-link-button"
              onClick={() => {
                void supabase.auth.signOut();
                setStep("password");
                setCode("");
                setError("");
                setInfo("");
              }}
            >
              Usar outro e-mail
            </button>
          </div>
        </form>
      )}
    </EditorialShell>
  );
}
