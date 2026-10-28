import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { VideoHub } from "@/components/VideoHub";
import { getChannelVideos } from "@/lib/site.functions";

export const Route = createFileRoute("/videos")({
  loader: () => getChannelVideos(),
  staleTime: 60_000,
  head: () => ({
    meta: [
      { title: "Vídeos e lives | Canal Transforma" },
      {
        name: "description",
        content:
          "Lives semanais e vídeos do Canal Transforma no YouTube: conversas e reportagens sobre Catanduva.",
      },
      { property: "og:title", content: "Vídeos e lives | Canal Transforma" },
      {
        property: "og:description",
        content: "Assista às lives semanais e aos vídeos do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.canaltransforma.com.br/videos" }],
  }),
  component: VideosPage,
});

function VideosPage() {
  const videos = Route.useLoaderData();
  return (
    <>
      <SiteHeader />
      <section className="listing-shell">
        <Link to="/" className="back-link">
          ← Voltar para a capa
        </Link>
        <p className="eyebrow">Vídeos e lives</p>
        <h1>Assista ao Canal Transforma</h1>
        <p className="listing-intro">
          As lives semanais e os vídeos do canal, no mesmo lugar das reportagens.
        </p>
        <VideoHub videos={videos} showAllLink={false} />
      </section>
      <SiteFooter />
    </>
  );
}
