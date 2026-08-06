import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { stories } from "@/data/stories";

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

  return (
    <>
      <SiteHeader />
      <main className="article">
        <span className={`tag ${story.color}`}>{story.section}</span>
        <h1>{story.title}</h1>
        <p className="summary">{story.summary}</p>
        <img className="cover" src={story.image} alt="" />
        <div className="metadata">
          <b>Canal Transforma</b>
          <span>Publicado em {story.date}</span>
        </div>
        <div className="article-text">
          <p>
            Esta é uma reportagem de demonstração do Canal Transforma. O conteúdo editorial será
            produzido pela equipe responsável, com apuração, contexto e informação verificada para a
            população de Catanduva.
          </p>
          <p>
            Na versão completa, o editor permite organizar textos, imagens, vídeos e materiais
            complementares de acordo com a necessidade de cada publicação.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
