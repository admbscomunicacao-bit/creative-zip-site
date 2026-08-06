import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StoryCard, SectionTitle } from "@/components/StoryCard";
import { sectionBySlug, stories } from "@/data/stories";

export const Route = createFileRoute("/editoria/$section")({
  loader: ({ params }) => {
    const section = sectionBySlug(params.section);
    if (!section) throw notFound();
    return { name: section.name };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.name ?? "Editoria";
    const title = `${name} — Canal Transforma`;
    const description = `Últimas notícias de ${name} em Catanduva, apuradas pela redação do Canal Transforma.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: SectionPage,
});

function SectionPage() {
  const { name } = Route.useLoaderData();
  const list = stories.filter((s) => s.section === name);

  return (
    <>
      <SiteHeader />
      <main className="shell listing">
        <SectionTitle eyebrow="Editoria" title={name} />
        <section className="grid">
          {list.map((s) => (
            <StoryCard story={s} key={s.slug} />
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
