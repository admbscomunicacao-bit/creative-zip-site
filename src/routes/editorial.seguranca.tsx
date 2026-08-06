import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
          "Gerencie seus aplicativos autenticadores e a segurança da sua conta editorial do Canal Transforma.",
      },
      { property: "og:title", content: "Segurança da conta editorial — Canal Transforma" },
      {
        property: "og:description",
        content: "Autenticadores e ações sensíveis da conta editorial do Canal Transforma.",
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
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const factors = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw new Error(listError.message);
      return data.totp ?? [];
    },
    retry: false,
  });

  const removeFactor = async (factorId: string) => {
    setError("");
    setInfo("");
    if (!account) return;
    // Sensitive action: re-confirm the current password before unenrolling.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password,
    });
    if (reauthError) {
      setError("Confirme sua senha atual para remover um autenticador.");
      return;
    }
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    if (unenrollError) {
      setError(friendlyAuthError(unenrollError.message));
      return;
    }
    setPassword("");
    setInfo("Autenticador removido.");
    await factors.refetch();
  };

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Segurança da conta"
      intro="Cadastre um segundo autenticador como recuperação e remova dispositivos que você não usa mais."
      backTo="/editorial/perfil"
      backLabel="← Voltar para o perfil"
    >
      <div className="editorial-status-card">
        <h2 className="admin-subtitle">Autenticadores cadastrados</h2>
        <ul className="audit-list">
          {(factors.data ?? []).length === 0 && <li>Nenhum autenticador cadastrado.</li>}
          {(factors.data ?? []).map((f) => (
            <li key={f.id}>
              <strong>{f.friendly_name || "Autenticador TOTP"}</strong> — {f.status}
              <br />
              <button
                type="button"
                className="editorial-secondary"
                onClick={() => removeFactor(f.id)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
        <label>
          Senha atual (obrigatória para ações sensíveis)
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="editorial-links">
          <button
            type="button"
            className="editorial-link-button"
            onClick={() => navigate({ to: "/editorial/mfa" })}
          >
            Adicionar autenticador
          </button>
        </div>
        {info && <p className="login-message">{info}</p>}
        {error && <p className="login-message login-error">{error}</p>}
      </div>
    </EditorialShell>
  );
}
