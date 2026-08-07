import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { EditorialShell, nextEditorialStep } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { getMyEditorialAccount, type EditorialAccount } from "@/lib/editorial.functions";

export const Route = createFileRoute("/editorial/entrar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrando na área editorial — Canal Transforma" },
      {
        name: "description",
        content:
          "Confirmação do link de acesso enviado por e-mail para a redação do Canal Transforma.",
      },
      { property: "og:title", content: "Entrando na área editorial — Canal Transforma" },
      {
        property: "og:description",
        content: "Validando o link de acesso enviado por e-mail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditorialMagicLinkLanding,
});

function EditorialMagicLinkLanding() {
  const navigate = useNavigate();
  const fetchAccount = useServerFn(getMyEditorialAccount);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      // O cliente Supabase processa o token do link (hash/query) na inicialização.
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          const account = (await fetchAccount().catch(() => null)) as EditorialAccount | null;
          if (cancelled) return;
          await navigate({ to: nextEditorialStep(account), replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      if (!cancelled) {
        setError(
          "Não foi possível validar o link de acesso. Ele pode ter expirado — entre novamente com e-mail e senha.",
        );
        await navigate({ to: "/editorial", replace: true });
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [fetchAccount, navigate]);

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Validando seu acesso..."
      intro="Aguarde um instante enquanto confirmamos o link enviado para o seu e-mail."
    >
      {error && <p className="login-message login-error">{error}</p>}
    </EditorialShell>
  );
}
