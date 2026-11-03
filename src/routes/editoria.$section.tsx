import { SITE_URL } from "@/lib/brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StoryListing } from "@/components/StoryListing";
import { sectionBySlug, sections } from "@/data/stories";
import { listPublishedStories } from "@/lib/public-articles.functions";

export const Route = createFileRoute("/editoria/$section")({
  loader: async ({ params }) => {
    const meta = sectionBySlug(params.section);
    if (!meta) return { stories: [], hasMore: false };
    return listPublishedStories({ data: { section: meta.name, limit: 24 } });
  },
  staleTime: 30_000,
  head: ({ params }) => {
    const s = sectionBySlug(params.section);
    const title = `${s?.name ?? "Editoria"} | Canal Transforma`;
    const description = `Reportagens de ${s?.name ?? "Catanduva"} no Canal Transforma: informação local com apuração e contexto.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:url", content: `${SITE_URL}/editoria/${params.section}` },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/editoria/${params.section}` }],
    };
  },
  component: SectionPage,
});

function SectionPage() {
  const { section } = Route.useParams();
  const meta = sectionBySlug(section);
  const { stories: list, hasMore } = Route.useLoaderData();

  return (
    <>
      <SiteHeader />
      <section className="listing-shell">
        <p className="eyebrow">Editoria</p>
        <h1>{meta?.name ?? "Editoria"}</h1>
        <p className="listing-intro">
          Acompanhe as reportagens, informações úteis e conversas que movimentam Catanduva.
        </p>
        {list.length === 0 ? (
          <p className="listing-intro">Ainda não há reportagens publicadas nesta editoria.</p>
        ) : (
          <StoryListing
            key={section}
            initial={list}
            hasMore={hasMore}
            filter={{ section: meta?.name as "Cidade" }}
            pageSize={24}
          />
        )}
        <div className="section-links">
          {sections
            .filter((s) => s.slug !== section)
            .map((s) => (
              <Link
                key={s.slug}
                to="/editoria/$section"
                params={{ section: s.slug }}
                className={`section-link section-${s.color}`}
              >
                {s.name}
                <b>→</b>
              </Link>
            ))}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
