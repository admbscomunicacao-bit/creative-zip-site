import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ListingCard } from "@/components/StoryCard";
import { stories } from "@/data/stories";

type Search = { q?: string | undefined };

export const Route = createFileRoute("/busca")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Pesquisa — Canal Transforma" },
      {
        name: "description",
        content: "Pesquise reportagens do Canal Transforma sobre Catanduva e região.",
      },
      { property: "og:title", content: "Pesquisa — Canal Transforma" },
      {
        property: "og:description",
        content: "Encontre reportagens de cidade, política, serviços e esportes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const term = (q ?? "").trim().toLowerCase();
  const results = term
    ? stories.filter((s) =>
        `${s.title} ${s.summary} ${s.section}`.toLowerCase().includes(term),
      )
    : [];

  return (
    <>
      <SiteHeader />
      <section className="listing-shell">
        <Link to="/" className="back-link">
          ← Voltar para a capa
        </Link>
        <p className="eyebrow">Pesquisa</p>
        <h1>{term ? `Resultados para “${q}”` : "O que você quer encontrar?"}</h1>
        <p className="listing-intro">
          {term
            ? `${results.length} ${results.length === 1 ? "reportagem encontrada" : "reportagens encontradas"}.`
            : "Use a busca no topo da página para procurar reportagens."}
        </p>
        {results.length > 0 && (
          <div className="listing-grid">
            {results.map((s) => (
              <ListingCard key={s.slug} story={s} />
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
