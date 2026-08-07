import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { EditorialShell, useEditorialAccount } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/editorial-auth";

export const Route = createFileRoute("/editorial/seguranca")({
  head: () => ({
    meta: [
      { title: "Segurança da conta editorial — Canal Transforma" },
      {
        name: "description",
        content:
          "Gerencie a senha e a verificação em duas etapas por código de e-mail da sua conta editorial do Canal Transforma.",
      },
      { property: "og:title", content: "Segurança da conta editorial — Canal Transforma" },
      {
        property: "og:description",
        content: "Senha e verificação em duas etapas da conta editorial do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const navigate = useNavigate();
  const { data: account } = useEditorialAccount();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const sendPasswordReset = async () => {
    if (!account) return;
    setError("");
    setInfo("");
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(account.email, {
      redirectTo: `${window.location.origin}/editorial/redefinir-senha`,
    });
    setBusy(false);
    if (resetError) {
      setError(friendlyAuthError(resetError.message));
      return;
    }
    setInfo("Enviamos um link seguro para você definir uma nova senha.");
  };

  const signOutEverywhere = async () => {
    setError("");
    setBusy(true);
    await supabase.auth.signOut({ scope: "global" });
    setBusy(false);
    await navigate({ to: "/editorial" });
  };

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Segurança da conta"
      intro="Sua conta usa e-mail e senha mais um código de verificação de seis dígitos enviado por e-mail a cada acesso à redação."
      backTo="/editorial/perfil"
      backLabel="← Voltar para o perfil"
    >
      <div className="editorial-status-card">
        <h2 className="admin-subtitle">Verificação em duas etapas</h2>
        <p className="password-hint">
          A cada login na área editorial enviamos um código de seis dígitos para{" "}
          <strong>{account?.email ?? "seu e-mail"}</strong>. O código expira em poucos minutos e só
          pode ser usado uma vez. Sem esse código, a redação e as ações administrativas continuam
          bloqueadas no servidor.
        </p>
        <div className="editorial-links">
          <button
            type="button"
            className="editorial-link-button"
            disabled={busy}
            onClick={sendPasswordReset}
          >
            Alterar minha senha
          </button>
          <button
            type="button"
            className="editorial-link-button"
            disabled={busy}
            onClick={signOutEverywhere}
          >
            Encerrar sessões em todos os dispositivos
          </button>
          <Link to="/editorial/perfil">Meu perfil</Link>
        </div>
        {info && <p className="login-message">{info}</p>}
        {error && <p className="login-message login-error">{error}</p>}
      </div>
    </EditorialShell>
  );
}
