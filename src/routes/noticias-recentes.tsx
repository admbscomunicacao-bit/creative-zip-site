import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard } from "@/components/StoryCard";
import { stories } from "@/data/stories";

export const Route = createFileRoute("/noticias-recentes")({
  head: () => ({
    meta: [
      { title: "Notícias recentes — Canal Transforma" },
      {
        name: "description",
        content: "Todas as reportagens mais recentes publicadas pelo Canal Transforma.",
      },
      { property: "og:title", content: "Notícias recentes — Canal Transforma" },
      {
        property: "og:description",
        content: "O que também aconteceu em Catanduva: reportagens recentes do portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecentNews,
});

function RecentNews() {
  return (
    <>
      <SiteHeader />
      <section className="listing-shell">
        <Link to="/" className="back-link">
          ← Voltar para a capa
        </Link>
        <p className="eyebrow">Mais recentes</p>
        <h1>O que também aconteceu</h1>
        <p className="listing-intro">{stories.length} reportagens publicadas no portal.</p>
        <div className="listing-grid">
          {stories.map((s) => (
            <ListingCard key={s.slug} story={s} />
          ))}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
