import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  EditorialShell,
  editorialSignOut,
  useEditorialAccount,
} from "@/components/editorial-shell";
import { formatPhoneBR, statusMessage } from "@/lib/editorial-auth";
import { updateMyEditorialProfile } from "@/lib/editorial.functions";
import { supabase } from "@/integrations/supabase/client";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_LABEL = "JPG, PNG, WebP ou GIF";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

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

  const [form, setForm] = useState({ fullName: "", phone: "", bio: "" });
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!isLoading && !account) void navigate({ to: "/editorial" });
    if (account) {
      setForm({
        fullName: account.fullName,
        phone: account.phone ?? "",
        bio: account.bio ?? "",
      });
      setAvatarPath(account.avatarUrl ? null : null); // path is not returned; preview only
      setAvatarPreview(account.avatarUrl ?? null);
    }
  }, [account, isLoading, navigate]);

  const handleFile = async (file: File) => {
    setUploadError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError(`Formato não aceito. Use ${ACCEPTED_LABEL}.`);
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("A imagem deve ter no máximo 5 MB.");
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) {
      setUploadError("Você precisa estar autenticado para enviar uma foto.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    setBusy(true);
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (upErr) {
      setUploadError(upErr.message || "Falha ao enviar a imagem.");
      setBusy(false);
      return;
    }

    setAvatarPath(path);
    const { data: preview } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    setAvatarPreview(preview?.signedUrl ?? null);
    setBusy(false);
  };

  const removeAvatar = () => {
    setAvatarPath("");
    setAvatarPreview(null);
    setUploadError("");
  };

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
          avatarPath: avatarPath ?? "",
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
    <EditorialShell backTo="/editorial" backLabel="← Voltar para o login">
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
          Foto de perfil (opcional)
          <div className="avatar-upload">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Pré-visualização da foto de perfil"
                className="avatar-preview"
              />
            ) : (
              <div className="avatar-placeholder">
                <span>Sem foto</span>
              </div>
            )}
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              disabled={busy}
            />
            {avatarPreview && (
              <button
                type="button"
                className="avatar-remove"
                onClick={removeAvatar}
                disabled={busy}
              >
                Remover foto
              </button>
            )}
          </div>
          <small className="avatar-hint">
            Arquivos aceitos: {ACCEPTED_LABEL}. Tamanho máximo: 5 MB.
          </small>
        </label>
        {uploadError && <p className="login-message login-error">{uploadError}</p>}
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
          Telefone celular
          <input
            type="tel"
            required
            inputMode="numeric"
            placeholder="(17) 99999-9999"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: formatPhoneBR(e.target.value) })}
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
