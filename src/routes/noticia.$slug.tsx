import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsCard } from "@/components/StoryCard";
import { sections, stories } from "@/data/stories";

export const Route = createFileRoute("/noticia/$slug")({
  loader: ({ params }) => {
    const story = stories.find((s) => s.slug === params.slug);
    if (!story) throw notFound();
    return { story };
  },
  head: ({ loaderData }) => {
    const story = loaderData?.story;
    const title = story ? `${story.title} — Canal Transforma` : "Reportagem — Canal Transforma";
    const description = story?.summary ?? "Reportagem do Canal Transforma.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(story?.image
          ? [
              { property: "og:image", content: story.image },
              { name: "twitter:image", content: story.image },
            ]
          : []),
      ],
    };
  },
  component: Article,
});

function Article() {
  const { story } = Route.useLoaderData();
  const sectionSlug =
    sections.find((s) => s.name === story.section)?.slug ?? "cidade";
  const related = stories.filter((s) => s.section === story.section && s.slug !== story.slug).slice(0, 3);

  return (
    <>
      <SiteHeader />
      <article className="article-shell">
        <Link to="/editoria/$section" params={{ section: sectionSlug }} className="back-link">
          ← Voltar para {story.section}
        </Link>
        <p className="story-section">{story.section}</p>
        <h1>{story.title}</h1>
        <p className="article-summary">{story.summary}</p>
        <div className={`article-art ${story.color}`}>
          <img src={story.image} alt={`Capa de ${story.title}`} />
        </div>
        <div className="article-meta">
          <span>Canal Transforma</span>
          <div>
            <time>Publicado em {story.date}</time>
            <time>Atualizado em {story.date}</time>
          </div>
        </div>
        <div className="article-body">
          <div className="story-text-block">
            <p>
              Esta é uma reportagem demonstrativa criada para apresentar a leitura dentro do
              portal. Na versão publicada, este espaço receberá a apuração da repórter
              responsável, com fontes identificadas, contexto e atualizações quando necessárias.
            </p>
          </div>
          <div className="story-text-block">
            <p>
              O Canal Transforma acompanha o dia a dia de Catanduva com atenção às informações
              úteis: serviços, decisões públicas, cultura e esporte, sempre com linguagem clara.
            </p>
          </div>
        </div>
      </article>
      {related.length > 0 && (
        <div className="home-shell">
          <section className="section-header">
            <div>
              <p className="eyebrow">Leia também</p>
              <h2>Mais de {story.section}</h2>
            </div>
            <div>
              <Link
                to="/editoria/$section"
                params={{ section: sectionSlug }}
                className="section-more"
              >
                Ver editoria <b>→</b>
              </Link>
            </div>
          </section>
          <section className="news-grid">
            {related.map((s) => (
              <NewsCard key={s.slug} story={s} />
            ))}
          </section>
        </div>
      )}
      <SiteFooter />
    </>
  );
}
