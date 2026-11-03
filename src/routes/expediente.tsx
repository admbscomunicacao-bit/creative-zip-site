import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/InfoPage";
import { listPublicTeam, type TeamRole } from "@/lib/team.functions";

const roleName: Record<TeamRole, string> = {
  admin: "Direção",
  editor: "Edição",
  reporter: "Reportagem",
};

export const Route = createFileRoute("/expediente")({
  loader: () => listPublicTeam(),
  staleTime: 300_000,
  head: () =>
    infoHead(
      "/expediente",
      "Expediente",
      "Quem faz o Canal Transforma: direção, edição e reportagem.",
    ),
  component: StaffPage,
});

function StaffPage() {
  const team = Route.useLoaderData();
  return (
    <InfoPage
      eyebrow="Sobre o Canal"
      title="Expediente"
      intro="As pessoas que apuram, revisam e publicam as notícias do Canal Transforma."
    >
      {team.length ? (
        <ul className="team-list">
          {team.map((m) => (
            <li key={m.slug}>
              <Link to="/autor/$slug" params={{ slug: m.slug }}>
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" width={72} height={72} loading="lazy" />
                ) : (
                  <span className="team-initial" aria-hidden="true">
                    {m.name.charAt(0)}
                  </span>
                )}
                <span>
                  <b>{m.name}</b>
                  <small>{roleName[m.role]}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>A equipe será apresentada aqui em breve.</p>
      )}
      <h2>Contato</h2>
      <p>
        Redação: <a href="mailto:contato@canaltransforma.com.br">contato@canaltransforma.com.br</a>
        <br />
        Sugestões de pauta e pedidos de correção: <Link to="/fale-conosco">fale conosco</Link>.
      </p>
    </InfoPage>
  );
}
