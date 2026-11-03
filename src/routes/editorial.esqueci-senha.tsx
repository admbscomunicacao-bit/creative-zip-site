import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { EditorialShell } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, friendlyAuthError, passwordSchema } from "@/lib/editorial-auth";
import {
  brandCodesEnabled,
  requestPasswordReset,
  resetPasswordWithCode,
} from "@/lib/account-codes.functions";

export const Route = createFileRoute("/editorial/esqueci-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha editorial | Canal Transforma" },
      {
        name: "description",
        content: "Receba um código por e-mail para criar uma nova senha da sua conta editorial.",
      },
      { property: "og:title", content: "Recuperar senha editorial | Canal Transforma" },
      {
        property: "og:description",
        content: "Recuperação de senha da redação do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const checkBrand = useServerFn(brandCodesEnabled);
  const requestReset = useServerFn(requestPasswordReset);
  const confirmReset = useServerFn(resetPasswordWithCode);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setInfo("");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError("Informe um e-mail válido.");
      return;
    }
    setBusy(true);
    try {
      if (await checkBrand().catch(() => false)) {
        await requestReset({ data: { email: parsed.data } });
        setStep("code");
        setInfo("Se existir uma conta com este e-mail, enviamos um código de seis dígitos.");
        return;
      }
      // Sem a caixa da marca: link padrão do sistema de login.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/editorial/redefinir-senha`,
      });
      if (resetError) {
        setError(friendlyAuthError(resetError.message));
        return;
      }
      setInfo("Se existir uma conta com este e-mail, enviamos as instruções de recuperação.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o código.");
    } finally {
      setBusy(false);
    }
  };

  const saveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!/^\d{6}$/.test(code.trim())) {
      setError("O código tem seis dígitos.");
      return;
    }
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Senha inválida");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      await confirmReset({ data: { email, code: code.trim(), password } });
      setInfo("Senha trocada. Entre com a senha nova.");
      await navigate({ to: "/editorial" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível trocar a senha.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Esqueci minha senha"
      intro={
        step === "email"
          ? "Informe seu e-mail. Enviaremos um código de seis dígitos para você criar uma nova senha."
          : `Digite o código enviado para ${email} e escolha a nova senha: mínimo 8 caracteres, com maiúsculas, minúsculas, número e símbolo.`
      }
      backTo="/editorial"
      backLabel="← Voltar para o login"
    >
      {step === "email" ? (
        <form className="login-form" onSubmit={sendCode}>
          <label>
            E-mail
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@canaltransforma.com.br"
            />
          </label>
          <button className="login-submit" type="submit" disabled={busy}>
            {busy ? "Enviando..." : "Enviar código"} <b>→</b>
          </button>
          {info && <p className="login-message">{info}</p>}
          {error && <p className="login-message login-error">{error}</p>}
          <div className="editorial-links">
            <Link to="/editorial">Voltar para o login</Link>
          </div>
        </form>
      ) : (
        <form className="login-form" onSubmit={saveNewPassword}>
          <label>
            Código de seis dígitos
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label>
            Nova senha
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Confirmar nova senha
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button className="login-submit" type="submit" disabled={busy}>
            {busy ? "Salvando..." : "Salvar nova senha"} <b>→</b>
          </button>
          {info && <p className="login-message">{info}</p>}
          {error && <p className="login-message login-error">{error}</p>}
          <div className="editorial-links">
            <button
              type="button"
              className="link-button"
              disabled={busy}
              onClick={() => void sendCode()}
            >
              Enviar outro código
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setStep("email");
                setCode("");
                setInfo("");
                setError("");
              }}
            >
              Trocar e-mail
            </button>
          </div>
        </form>
      )}
    </EditorialShell>
  );
}
