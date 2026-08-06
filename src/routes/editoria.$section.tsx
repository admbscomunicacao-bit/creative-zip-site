import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard } from "@/components/StoryCard";
import { sectionBySlug, sections, stories } from "@/data/stories";

export const Route = createFileRoute("/editoria/$section")({
  head: ({ params }) => {
    const s = sectionBySlug(params.section);
    const title = `${s?.name ?? "Editoria"} — Canal Transforma`;
    const description = `Reportagens de ${s?.name ?? "Catanduva"} no Canal Transforma: informação local com apuração e contexto.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SectionPage,
});

function SectionPage() {
  const { section } = Route.useParams();
  const meta = sectionBySlug(section);
  const list = stories.filter((s) => s.section === meta?.name);

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
          <div className="listing-grid">
            {list.map((s) => (
              <ListingCard key={s.slug} story={s} />
            ))}
          </div>
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
