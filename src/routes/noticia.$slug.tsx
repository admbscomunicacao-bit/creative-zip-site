import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsCard } from "@/components/StoryCard";
import { ShareBar } from "@/components/ShareBar";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { sections, type Section, type SectionColor } from "@/data/stories";
import {
  formatStoryDate,
  getPublishedArticle,
  listPublishedStories,
} from "@/lib/public-articles.functions";
import { youtubeThumb, youtubeVideoId } from "@/lib/youtube";

export const Route = createFileRoute("/noticia/$slug")({
  loader: async ({ params }) => {
    const article = await getPublishedArticle({ data: { slug: params.slug } });
    if (!article) throw notFound();
    const { stories: related } = await listPublishedStories({
      data: { section: article.section as Section, exclude: article.slug, limit: 3 },
    });
    const videoId = youtubeVideoId(article.videoUrl);
    const updatedLater =
      article.updatedAt &&
      article.publishedAt &&
      new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime() > 10 * 60_000;
    return {
      related,
      videoId,
      updatedAtIso: updatedLater ? new Date(article.updatedAt!).toISOString() : null,
      updatedLabel: updatedLater ? formatStoryDate(article.updatedAt) : "",
      story: {
        slug: article.slug,
        section: article.section as Section,
        title: article.title,
        summary: article.summary,
        date: article.publishedAt
          ? new Date(article.publishedAt).toLocaleString("pt-BR", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "America/Sao_Paulo",
            })
          : "",
        color: article.color as SectionColor,
        // Sem capa, a miniatura do vídeo vira a imagem de compartilhamento.
        image: article.coverUrl ?? (videoId ? youtubeThumb(videoId) : ""),
      },
      bodyHtml: article.bodyHtml,
      author: article.authorName || "Canal Transforma",
      publishedAtIso: article.publishedAt ? new Date(article.publishedAt).toISOString() : null,
    };
  },
  head: ({ params, loaderData }) => {
    const story = loaderData?.story;
    const url = `https://www.canaltransforma.com.br/noticia/${params.slug}`;
    const title = story ? `${story.title} | Canal Transforma` : "Reportagem | Canal Transforma";
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
      links: [
        { rel: "canonical", href: url },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Montserrat:wght@600;700&family=Caveat:wght@400;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;600&family=Roboto+Slab:wght@400;700&family=Source+Code+Pro:wght@400;600&display=swap",
        },
      ],
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
                      dateModified: loaderData.updatedAtIso ?? loaderData.publishedAtIso,
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
                    url: "https://www.canaltransforma.com.br/brand/icone-app-512.png",
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
  const { story, bodyHtml, author, related, videoId, updatedLabel } = Route.useLoaderData();
  const sectionSlug = sections.find((s) => s.name === story.section)?.slug ?? "cidade";
  const url = `https://www.canaltransforma.com.br/noticia/${story.slug}`;

  return (
    <>
      <SiteHeader />
      <article className="article-shell">
        <Link to="/editoria/$section" params={{ section: sectionSlug }} className="back-link">
          ← Voltar para {story.section}
        </Link>
        <p className={`story-section section-${story.color}`}>{story.section}</p>
        <h1>{story.title}</h1>
        <p className="article-summary">{story.summary}</p>
        {videoId ? (
          <div className="article-video">
            <YouTubePlayer id={videoId} title={story.title} />
          </div>
        ) : story.image ? (
          <div className={`article-art ${story.color}`}>
            <img src={story.image} alt={`Capa de ${story.title}`} />
          </div>
        ) : null}
        <div className="article-meta">
          <span>{author}</span>
          <div>
            <time>Publicado em {story.date}</time>
            {updatedLabel ? <time>Atualizado em {updatedLabel}</time> : null}
          </div>
        </div>
        <ShareBar url={url} title={story.title} />
        <div className="article-body">
          <div
            className="story-text-block article-rich"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>
        <div className="article-share-end">
          <p>Achou útil? Mande para quem também precisa saber.</p>
          <ShareBar url={url} title={story.title} />
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
