import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard } from "@/components/StoryCard";
import { listPublishedStories } from "@/lib/public-articles.functions";

export const Route = createFileRoute("/noticias-recentes")({
  loader: () => listPublishedStories({ data: { limit: 60 } }),
  staleTime: 30_000,
  head: () => ({
    meta: [
      { title: "Notícias recentes | Canal Transforma" },
      {
        name: "description",
        content: "Todas as reportagens mais recentes publicadas pelo Canal Transforma.",
      },
      { property: "og:title", content: "Notícias recentes | Canal Transforma" },
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
  const { stories } = Route.useLoaderData();
  return (
    <>
      <SiteHeader />
      <section className="listing-shell">
        <Link to="/" className="back-link">
          ← Voltar para a capa
        </Link>
        <p className="eyebrow">Mais recentes</p>
        <h1>O que também aconteceu</h1>
        <p className="listing-intro">
          {stories.length === 0
            ? "Ainda não há reportagens publicadas. Volte em breve."
            : stories.length === 1
              ? "1 reportagem publicada no portal."
              : `${stories.length} reportagens publicadas no portal.`}
        </p>
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
