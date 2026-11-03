import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StoryListing } from "@/components/StoryListing";
import { sections } from "@/data/stories";
import { listPublishedStories } from "@/lib/public-articles.functions";

type Search = { q?: string | undefined };

export const Route = createFileRoute("/busca")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ q: (search.q ?? "").trim().slice(0, 120) }),
  loader: async ({ deps }) =>
    deps.q
      ? await listPublishedStories({ data: { q: deps.q, limit: 24 } })
      : { stories: [], hasMore: false },

  head: () => ({
    meta: [
      { title: "Pesquisa | Canal Transforma" },
      // Resultado de busca não deve virar página no Google.
      { name: "robots", content: "noindex, follow" },
      {
        name: "description",
        content: "Pesquise reportagens do Canal Transforma sobre Catanduva e região.",
      },
      { property: "og:title", content: "Pesquisa | Canal Transforma" },
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
  const { stories: results, hasMore } = Route.useLoaderData();

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
          {!term
            ? "Use a busca no topo da página para procurar reportagens."
            : results.length === 0
              ? "Nenhuma reportagem com esse termo. Tente outra palavra ou comece por uma editoria."
              : hasMore
                ? "Reportagens que falam do assunto, das mais novas para as mais antigas."
                : `${results.length} ${results.length === 1 ? "reportagem encontrada" : "reportagens encontradas"}.`}
        </p>
        {results.length === 0 && (
          <div className="section-links search-sections">
            {sections.map((s) => (
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
        )}
        {results.length > 0 && (
          <StoryListing
            key={term}
            initial={results}
            hasMore={hasMore}
            filter={{ q: q ?? "" }}
            pageSize={24}
          />
        )}
      </section>
      <SiteFooter />
    </>
  );
}
