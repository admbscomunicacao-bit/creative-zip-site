import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { EditorialShell } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneBR, friendlyAuthError, signupSchema, toE164BR } from "@/lib/editorial-auth";

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
    acceptedTerms: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
      intro="Cada pessoa da redação usa uma conta individual. Depois do cadastro, confirme seu e-mail com o código de seis dígitos."
      backTo="/editorial"
      backLabel="← Voltar para o login"
    >
      <form className="login-form" onSubmit={submit}>
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
