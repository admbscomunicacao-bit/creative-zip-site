import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { EditorialShell } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError, passwordSchema } from "@/lib/editorial-auth";
import { recordAuthEvent } from "@/lib/editorial.functions";

export const Route = createFileRoute("/editorial/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Definir nova senha — Canal Transforma" },
      {
        name: "description",
        content: "Crie uma nova senha forte para sua conta da área editorial do Canal Transforma.",
      },
      { property: "og:title", content: "Definir nova senha — Canal Transforma" },
      {
        property: "og:description",
        content: "Conclusão da recuperação de senha da redação do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const logEvent = useServerFn(recordAuthEvent);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
      if (!data.session) {
        setError("Abra o link mais recente enviado por e-mail para redefinir sua senha.");
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
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
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(friendlyAuthError(updateError.message));
        return;
      }
      await logEvent({ data: { action: "password_reset_done" } }).catch(() => undefined);
      setInfo("Senha atualizada. Entrando novamente...");
      await supabase.auth.signOut();
      await navigate({ to: "/editorial" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Definir nova senha"
      intro="Escolha uma senha forte: mínimo 8 caracteres, com maiúsculas, minúsculas, número e símbolo."
      backTo="/editorial"
      backLabel="← Voltar para o login"
    >
      <form className="login-form" onSubmit={submit}>
        <label>
          Nova senha
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!ready}
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
            disabled={!ready}
          />
        </label>
        <button className="login-submit" type="submit" disabled={busy || !ready}>
          {busy ? "Salvando..." : "Salvar nova senha"} <b>→</b>
        </button>
        {info && <p className="login-message">{info}</p>}
        {error && <p className="login-message login-error">{error}</p>}
      </form>
    </EditorialShell>
  );
}
