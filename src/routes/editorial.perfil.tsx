import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  EditorialShell,
  editorialSignOut,
  useEditorialAccount,
} from "@/components/editorial-shell";
import { statusMessage } from "@/lib/editorial-auth";
import { updateMyEditorialProfile } from "@/lib/editorial.functions";

export const Route = createFileRoute("/editorial/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil editorial — Canal Transforma" },
      {
        name: "description",
        content: "Complete seu perfil de repórter do Canal Transforma com foto e biografia.",
      },
      { property: "og:title", content: "Meu perfil editorial — Canal Transforma" },
      {
        property: "og:description",
        content: "Perfil da equipe editorial do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { data: account, isLoading, refetch } = useEditorialAccount();
  const updateProfile = useServerFn(updateMyEditorialProfile);

  const [form, setForm] = useState({ fullName: "", phone: "", bio: "", avatarUrl: "" });
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && !account) void navigate({ to: "/editorial" });
    if (account) {
      setForm({
        fullName: account.fullName,
        phone: account.phone ?? "",
        bio: account.bio ?? "",
        avatarUrl: account.avatarUrl ?? "",
      });
    }
  }, [account, isLoading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await updateProfile({
        data: {
          fullName: form.fullName,
          phone: form.phone,
          bio: form.bio,
          avatarUrl: form.avatarUrl,
        },
      });
      setInfo("Perfil atualizado.");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o perfil.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Meu perfil"
      intro="Foto e biografia são opcionais, mas ajudam a identificar sua assinatura nas reportagens."
      backTo="/editorial"
      backLabel="← Voltar para o login"
    >
      {account && (
        <div className="editorial-status-card">
          <p>
            <strong>{account.email}</strong>
          </p>
          <p className="editorial-badges">
            <span className={`status-pill status-${account.status}`}>
              {account.status === "approved"
                ? "Aprovado"
                : account.status === "pending"
                  ? "Aguardando aprovação"
                  : "Bloqueado"}
            </span>
            <span className="status-pill">{account.isAdmin ? "Administrador" : "Repórter"}</span>
            <span className="status-pill">
              {account.mfaEnrolledAt ? "MFA configurado" : "MFA pendente"}
            </span>
          </p>
          {statusMessage(account.status) && <p>{statusMessage(account.status)}</p>}
          <div className="editorial-links">
            {account.status === "approved" && <Link to="/editorial/mfa">Configurar MFA</Link>}
            {account.status === "approved" && account.mfaEnrolledAt && (
              <Link to="/editorial/redacao">Ir para a redação</Link>
            )}
            <Link to="/editorial/seguranca">Segurança</Link>
            <button
              type="button"
              className="editorial-link-button"
              onClick={async () => {
                await editorialSignOut();
                await navigate({ to: "/editorial" });
              }}
            >
              Sair
            </button>
          </div>
        </div>
      )}

      <form className="login-form" onSubmit={submit}>
        <label>
          Nome completo
          <input
            type="text"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </label>
        <label>
          Telefone (opcional)
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <label>
          Foto de perfil (URL, opcional)
          <input
            type="url"
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            placeholder="https://..."
          />
        </label>
        <label>
          Biografia (opcional)
          <textarea
            rows={4}
            maxLength={1000}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Repórter de cidade em Catanduva desde 2019."
          />
        </label>
        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? "Salvando..." : "Salvar perfil"} <b>→</b>
        </button>
        {info && <p className="login-message">{info}</p>}
        {error && <p className="login-message login-error">{error}</p>}
      </form>
    </EditorialShell>
  );
}
