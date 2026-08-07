import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EditorialShell, editorialSignOut, useRequireEditorialAccount } from "@/components/editorial-shell";

export const Route = createFileRoute("/editorial/redacao")({
  head: () => ({
    meta: [
      { title: "Redação — Canal Transforma" },
      {
        name: "description",
        content:
          "Painel da redação do Canal Transforma, liberado apenas para contas aprovadas com verificação em duas etapas.",
      },
      { property: "og:title", content: "Redação — Canal Transforma" },
      {
        property: "og:description",
        content: "Painel interno da equipe editorial do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Newsroom,
});

function Newsroom() {
  const navigate = useNavigate();
  const { data: account, isLoading } = useRequireEditorialAccount({ requireEditorialAccess: true });

  if (isLoading || !account) {
    return (
      <EditorialShell eyebrow="Área editorial" title="Redação">
        <p className="login-message">Verificando suas permissões...</p>
      </EditorialShell>
    );
  }

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title={`Olá, ${account.fullName || "jornalista"}.`}
      intro="Sua sessão está aprovada e com verificação em duas etapas validada."
      backTo="/"
    >
      <div className="editorial-status-card">
        <p className="editorial-badges">
          <span className="status-pill status-approved">Aprovado</span>
          <span className="status-pill">{account.isAdmin ? "Administrador" : "Repórter"}</span>
          <span className="status-pill">Código verificado</span>
        </p>
        <div className="editorial-links">
          <Link to="/editorial/perfil">Meu perfil</Link>
          <Link to="/editorial/seguranca">Segurança da conta</Link>
          {account.isAdmin && <Link to="/editorial/usuarios">Administrar usuários</Link>}
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
        <p className="password-hint">
          As ferramentas de criação, edição e publicação de reportagens entram aqui. Todas as ações
          continuam validadas no servidor por status aprovado, papel e sessão verificada por código.
        </p>
      </div>
    </EditorialShell>
  );
}
