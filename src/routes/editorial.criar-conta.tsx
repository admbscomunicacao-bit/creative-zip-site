import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { EditorialShell } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneBR, friendlyAuthError, signupSchema, toE164BR } from "@/lib/editorial-auth";
import {
  AVATAR_MAX_SIZE,
  AVATAR_TYPES,
  AVATAR_TYPES_LABEL,
  setPendingSignup,
} from "@/lib/editorial-signup-store";

export const Route = createFileRoute("/editorial/criar-conta")({
  head: () => ({
    meta: [
      { title: "Criar conta editorial — Canal Transforma" },
      {
        name: "description",
        content:
          "Crie sua conta individual de repórter do Canal Transforma e confirme seu e-mail por código.",
      },
      { property: "og:title", content: "Criar conta editorial — Canal Transforma" },
      {
        property: "og:description",
        content: "Cadastro da redação do Canal Transforma com confirmação de e-mail por código.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreateAccount,
});

function CreateAccount() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    bio: "",
    acceptedTerms: false,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pickFile = (file: File) => {
    setUploadError("");
    if (!AVATAR_TYPES.includes(file.type)) {
      setUploadError(`Formato não aceito. Use ${AVATAR_TYPES_LABEL}.`);
      return;
    }
    if (file.size > AVATAR_MAX_SIZE) {
      setUploadError("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Verifique os dados informados");
      return;
    }
    setBusy(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/editorial/confirmar-email`,
          data: {
            full_name: parsed.data.fullName,
            phone: toE164BR(parsed.data.phone),
            terms_accepted: true,
          },
        },
      });
      if (signUpError) {
        setError(friendlyAuthError(signUpError.message));
        return;
      }
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("Já existe uma conta com este e-mail.");
        return;
      }
      setPendingSignup({
        fullName: parsed.data.fullName,
        phone: formatPhoneBR(parsed.data.phone),
        bio: form.bio,
        avatarFile,
      });
      await navigate({
        to: "/editorial/confirmar-email",
        search: { email: parsed.data.email },
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Criar conta editorial"
      intro="Preencha todos os seus dados, inclusive a foto de perfil. Em seguida confirme seu e-mail com o código de seis dígitos."
      backTo="/editorial"
      backLabel="← Voltar para o login"
    >
      <form className="login-form" onSubmit={submit}>
        <label>
          Foto de perfil
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
              accept={AVATAR_TYPES.join(",")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) pickFile(file);
              }}
              disabled={busy}
            />
            {avatarPreview && (
              <button
                type="button"
                className="avatar-remove"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview(null);
                }}
                disabled={busy}
              >
                Remover foto
              </button>
            )}
          </div>
          <small className="avatar-hint">
            Arquivos aceitos: {AVATAR_TYPES_LABEL}. Tamanho máximo: 5 MB.
          </small>
        </label>
        {uploadError && <p className="login-message login-error">{uploadError}</p>}
        <label>
          Nome completo
          <input
            type="text"
            required
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Maria Souza"
          />
        </label>
        <label>
          E-mail
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="seuemail@canaltransforma.com.br"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </label>
        <label>
          Confirmar senha
          <input
            type="password"
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => set("confirmPassword", e.target.value)}
            placeholder="Repita a senha"
          />
        </label>
        <label>
          Telefone celular
          <input
            type="tel"
            required
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => set("phone", formatPhoneBR(e.target.value))}
            placeholder="(17) 99999-9999"
          />
        </label>
        <label>
          Biografia
          <textarea
            rows={4}
            maxLength={1000}
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Repórter de cidade em Catanduva desde 2019."
          />
        </label>
        <p className="password-hint">
          A senha precisa ter no mínimo 8 caracteres, com letras maiúsculas e minúsculas, número e
          símbolo. Senhas presentes em vazamentos conhecidos são recusadas.
        </p>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={(e) => set("acceptedTerms", e.target.checked)}
          />
          <span>Aceito os termos de uso e a política de privacidade do Canal Transforma.</span>
        </label>
        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? "Criando conta..." : "Criar conta"} <b>→</b>
        </button>
        {error && <p className="login-message login-error">{error}</p>}
        <div className="editorial-links">
          <Link to="/editorial">Já tenho conta</Link>
        </div>
      </form>
    </EditorialShell>
  );
}
