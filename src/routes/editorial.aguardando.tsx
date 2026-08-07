import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  EditorialShell,
  editorialSignOut,
  useEditorialAccount,
} from "@/components/editorial-shell";

export const Route = createFileRoute("/editorial/aguardando")({
  head: () => ({
    meta: [
      { title: "Conta em aprovação — Canal Transforma" },
      {
        name: "description",
        content:
          "Sua conta editorial do Canal Transforma foi criada e aguarda a aprovação de um administrador.",
      },
      { property: "og:title", content: "Conta em aprovação — Canal Transforma" },
      {
        property: "og:description",
        content: "Aguardando aprovação do administrador da redação do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WaitingApproval,
});

function WaitingApproval() {
  const navigate = useNavigate();
  const { data: account, isLoading } = useEditorialAccount();

  useEffect(() => {
    if (isLoading) return;
    if (!account) {
      void navigate({ to: "/editorial" });
      return;
    }
    if (account.status === "approved") void navigate({ to: "/editorial/redacao" });
  }, [account, isLoading, navigate]);

  return (
    <EditorialShell backTo="/editorial" backLabel="← Voltar para o login">
      <div className="editorial-status-card">
        <p>
          <strong>{account?.email ?? ""}</strong>
        </p>
        <p className="editorial-badges">
          <span className={`status-pill status-${account?.status ?? "pending"}`}>
            {account?.status === "blocked" ? "Bloqueado" : "Aguardando aprovação"}
          </span>
        </p>
        <p>
          {account?.status === "blocked"
            ? "Sua conta foi bloqueada. Fale com um administrador do Canal Transforma."
            : "Seu cadastro está completo e seu e-mail foi confirmado. Um administrador do Canal Transforma precisa aprovar sua conta antes do primeiro acesso à área editorial. Você receberá acesso assim que a aprovação for feita."}
        </p>
        <div className="editorial-links">
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
    </EditorialShell>
  );
}
