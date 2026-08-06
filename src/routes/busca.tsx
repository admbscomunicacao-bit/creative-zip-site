import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StoryCard, SectionTitle } from "@/components/StoryCard";
import { stories } from "@/data/stories";

export const Route = createFileRoute("/busca")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  head: () => ({
    meta: [
      { title: "Busca — Canal Transforma" },
      {
        name: "description",
        content: "Pesquise reportagens do Canal Transforma por tema, bairro ou serviço.",
      },
      { property: "og:title", content: "Busca — Canal Transforma" },
      { property: "og:description", content: "Encontre reportagens do Canal Transforma." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const term = q.trim().toLowerCase();
  const list = term
    ? stories.filter((s) => `${s.title} ${s.summary} ${s.section}`.toLowerCase().includes(term))
    : stories;

  return (
    <>
      <SiteHeader />
      <main className="shell listing">
        <SectionTitle
          eyebrow="Busca"
          title={term ? `Resultados para “${q}”` : "Todas as notícias"}
        />
        {list.length === 0 ? (
          <p className="summary">Nenhuma reportagem encontrada para esse termo.</p>
        ) : (
          <section className="grid">
            {list.map((s) => (
              <StoryCard story={s} key={s.slug} />
            ))}
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
