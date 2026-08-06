import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard } from "@/components/StoryCard";
import { stories } from "@/data/stories";

export const Route = createFileRoute("/noticias-do-dia")({
  head: () => ({
    meta: [
      { title: "Notícias do dia — Canal Transforma" },
      {
        name: "description",
        content: "A seleção diária de reportagens do Canal Transforma sobre Catanduva.",
      },
      { property: "og:title", content: "Notícias do dia — Canal Transforma" },
      {
        property: "og:description",
        content: "A seleção diária da redação: cidade, política, serviços e esportes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DailyNews,
});

function DailyNews() {
  const list = stories.slice(0, 8);
  return (
    <>
      <SiteHeader />
      <section className="listing-shell">
        <Link to="/" className="back-link">
          ← Voltar para a capa
        </Link>
        <p className="eyebrow">Seleção diária</p>
        <h1>Notícias do dia</h1>
        <p className="listing-intro">
          As reportagens que a redação destaca hoje para quem mora em Catanduva.
        </p>
        <div className="listing-grid">
          {list.map((s) => (
            <ListingCard key={s.slug} story={s} />
          ))}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
