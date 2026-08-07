import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsCard } from "@/components/StoryCard";
import { sections, stories, type Section, type SectionColor } from "@/data/stories";
import { getPublishedArticle } from "@/lib/public-articles.functions";

export const Route = createFileRoute("/noticia/$slug")({
  loader: async ({ params }) => {
    const article = await getPublishedArticle({ data: { slug: params.slug } });
    if (!article) {
      const story = stories.find((s) => s.slug === params.slug);
      if (story)
        return {
          story,
          bodyHtml: null as string | null,
          author: "Canal Transforma",
          publishedAtIso: null as string | null,
        };
      throw notFound();
    }
    return {
      story: {
        slug: article.slug,
        section: article.section as Section,
        title: article.title,
        summary: article.summary,
        date: article.publishedAt
          ? new Date(article.publishedAt).toLocaleString("pt-BR", {
              dateStyle: "long",
              timeStyle: "short",
            })
          : "",
        color: article.color as SectionColor,
        image: article.coverUrl ?? "",
      },
      bodyHtml: article.bodyHtml,
      author: article.authorName || "Canal Transforma",
      publishedAtIso: article.publishedAt ? new Date(article.publishedAt).toISOString() : null,
    };
  },
  head: ({ params, loaderData }) => {
    const story = loaderData?.story;
    const url = `https://www.canaltransforma.com.br/noticia/${params.slug}`;
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
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: story
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                headline: story.title,
                description: story.summary,
                mainEntityOfPage: { "@type": "WebPage", "@id": url },
                url,
                inLanguage: "pt-BR",
                articleSection: story.section,
                ...(story.image ? { image: [story.image] } : {}),
                ...(loaderData?.publishedAtIso
                  ? {
                      datePublished: loaderData.publishedAtIso,
                      dateModified: loaderData.publishedAtIso,
                    }
                  : {}),
                author: {
                  "@type": "Person",
                  name: loaderData?.author ?? "Canal Transforma",
                },
                publisher: {
                  "@type": "NewsMediaOrganization",
                  name: "Canal Transforma",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://www.canaltransforma.com.br/favicon.png",
                  },
                },
              }),
            },
          ]
        : undefined,
    };
  },
  component: Article,
});

function Article() {
  const { story, bodyHtml, author } = Route.useLoaderData();
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
        {story.image ? (
          <div className={`article-art ${story.color}`}>
            <img src={story.image} alt={`Capa de ${story.title}`} />
          </div>
        ) : null}
        <div className="article-meta">
          <span>{author}</span>
          <div>
            <time>Publicado em {story.date}</time>
            <time>Atualizado em {story.date}</time>
          </div>
        </div>
        <div className="article-body">
          {bodyHtml ? (
            <div
              className="story-text-block article-rich"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <>
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
            </>
          )}
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
