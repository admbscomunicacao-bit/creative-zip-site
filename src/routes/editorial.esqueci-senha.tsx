import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EditorialShell } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, friendlyAuthError } from "@/lib/editorial-auth";

export const Route = createFileRoute("/editorial/esqueci-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha editorial — Canal Transforma" },
      {
        name: "description",
        content: "Receba um link seguro por e-mail para redefinir a senha da sua conta editorial.",
      },
      { property: "og:title", content: "Recuperar senha editorial — Canal Transforma" },
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
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError("Informe um e-mail válido.");
      return;
    }
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/editorial/redefinir-senha`,
      });
      if (resetError) {
        setError(friendlyAuthError(resetError.message));
        return;
      }
      setInfo("Se existir uma conta com este e-mail, enviamos as instruções de recuperação.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Esqueci minha senha"
      intro="Informe seu e-mail e enviaremos um link seguro para criar uma nova senha."
      backTo="/editorial"
      backLabel="← Voltar para o login"
    >
      <form className="login-form" onSubmit={submit}>
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
          {busy ? "Enviando..." : "Enviar link de recuperação"} <b>→</b>
        </button>
        {info && <p className="login-message">{info}</p>}
        {error && <p className="login-message login-error">{error}</p>}
        <div className="editorial-links">
          <Link to="/editorial">Voltar para o login</Link>
        </div>
      </form>
    </EditorialShell>
  );
}
