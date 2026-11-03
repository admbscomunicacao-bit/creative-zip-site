import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsCard } from "@/components/StoryCard";
import { getPublicAuthor, type TeamRole } from "@/lib/team.functions";

const roleName: Record<TeamRole, string> = {
  admin: "Direção",
  editor: "Editor(a)",
  reporter: "Repórter",
};

export const Route = createFileRoute("/autor/$slug")({
  loader: async ({ params }) => {
    const found = await getPublicAuthor({ data: { slug: params.slug } });
    if (!found) throw notFound();
    return found;
  },
  staleTime: 60_000,
  head: ({ params, loaderData }) => {
    const name = loaderData?.member.name ?? "Autor";
    const description =
      loaderData?.member.bio ||
      `Matérias de ${name} no Canal Transforma, jornalismo local de Catanduva.`;
    const url = `https://canaltransforma.com.br/autor/${params.slug}`;
    return {
      meta: [
        { title: `${name} | Canal Transforma` },
        { name: "description", content: description },
        { property: "og:title", content: `${name} | Canal Transforma` },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: AuthorPage,
});

function AuthorPage() {
  const { member, stories } = Route.useLoaderData();
  return (
    <>
      <SiteHeader />
      <div className="home-shell">
        <section className="author-head">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.name} width={120} height={120} />
          ) : (
            <span className="team-initial is-large" aria-hidden="true">
              {member.name.charAt(0)}
            </span>
          )}
          <div>
            <p className="eyebrow">{roleName[member.role]}</p>
            <h1>{member.name}</h1>
            {member.bio ? <p>{member.bio}</p> : null}
            <Link to="/expediente" className="section-more">
              Ver toda a equipe <b>→</b>
            </Link>
          </div>
        </section>
        <section className="section-header">
          <div>
            <h2>Matérias de {member.name.split(" ")[0]}</h2>
          </div>
        </section>
        {stories.length ? (
          <section className="news-grid">
            {stories.map((s) => (
              <NewsCard key={s.slug} story={s} />
            ))}
          </section>
        ) : (
          <p className="author-empty">Ainda não há matérias publicadas.</p>
        )}
      </div>
      <SiteFooter />
    </>
  );
}
