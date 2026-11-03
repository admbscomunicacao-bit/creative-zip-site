import { SITE_URL } from "@/lib/brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StoryListing } from "@/components/StoryListing";
import { listPublishedStories } from "@/lib/public-articles.functions";

export const Route = createFileRoute("/noticias-recentes")({
  loader: () => listPublishedStories({ data: { limit: 24 } }),
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
      { property: "og:url", content: `${SITE_URL}/noticias-recentes` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/noticias-recentes` }],
  }),
  component: RecentNews,
});

function RecentNews() {
  const { stories, hasMore } = Route.useLoaderData();
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
            : "As reportagens mais recentes do portal, da mais nova para a mais antiga."}
        </p>
        <StoryListing initial={stories} hasMore={hasMore} filter={{}} pageSize={24} />
      </section>
      <SiteFooter />
    </>
  );
}
