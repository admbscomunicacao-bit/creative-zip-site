import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LeadStory, MiniStory, NewsCard } from "@/components/StoryCard";
import { sections, stories } from "@/data/stories";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canal Transforma — Jornalismo local de Catanduva" },
      {
        name: "description",
        content:
          "Notícias de Catanduva com apuração e contexto: cidade, política, serviços e esportes no Canal Transforma.",
      },
      { property: "og:title", content: "Canal Transforma — Jornalismo local de Catanduva" },
      {
        property: "og:description",
        content: "Cidade, política, serviços e esportes com apuração e informação verificada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const colorClass: Record<string, string> = {
  cidade: "section-blue",
  politica: "section-red",
  servicos: "section-green",
  esportes: "section-yellow",
};

function Home() {
  const featured = stories.filter((s) => s.featured);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((x) => (x + 1) % featured.length), 6500);
    return () => clearInterval(id);
  }, [featured.length]);

  const active = featured[index] ?? featured[0]!;
  const daily = stories.slice(0, 4);
  const lead = daily[0]!;
  const secondary = daily.slice(1);
  const recent = stories.slice(4, 16);

  const go = (i: number) => setIndex((i + featured.length) % featured.length);

  return (
    <>
      <SiteHeader />
      <div className="home-shell">
        <h1 className="sr-only">
          Canal Transforma — jornalismo local de Catanduva e região
        </h1>
        <section
          className={`headline-carousel ${active.color} has-cover`}
          aria-label="Principais notícias"
        >
          <div className="carousel-media" aria-hidden="true">
            {featured.map((s, i) => (
              <div key={s.slug} className={`carousel-photo ${i === index ? "is-active" : ""}`}>
                <img src={s.image} alt="" loading={i === 0 ? "eager" : "lazy"} decoding="async" />
              </div>
            ))}
          </div>
          <div className="carousel-copy-stack">
            {featured.map((s, i) => (
              <div
                key={s.slug}
                className={`carousel-copy ${i === index ? "is-active" : ""}`}
                aria-hidden={i !== index}
              >
                <p className="eyebrow">Em destaque</p>
                <p className={`story-section section-${s.color}`}>{s.section}</p>
                <h2 className="carousel-title">{s.title}</h2>
                <p>{s.summary}</p>
                <Link
                  to="/noticia/$slug"
                  params={{ slug: s.slug }}
                  className="carousel-link"
                  aria-label={`Ler reportagem: ${s.title}`}
                  tabIndex={i === index ? 0 : -1}
                >
                  Ler reportagem <b>→</b>
                </Link>
              </div>
            ))}
          </div>
          <div className="carousel-side">
            <span>{String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="carousel-arrows" aria-label="Navegar pelas principais notícias">
            <button aria-label="Notícia anterior" onClick={() => go(index - 1)}>
              ←
            </button>
            <button aria-label="Próxima notícia" onClick={() => go(index + 1)}>
              →
            </button>
          </div>
          <div className="carousel-controls" role="tablist" aria-label="Escolher notícia em destaque">
            {featured.map((s, i) => (
              <button
                key={s.slug}
                role="tab"
                aria-selected={i === index}
                aria-label={`Mostrar: ${s.title}`}
                className={i === index ? "active" : ""}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </section>

        <section className="daily-section-header">
          <div>
            <p className="eyebrow">Seleção diária</p>
            <h2>Notícias do dia</h2>
          </div>
          <div>
            <Link to="/noticias-do-dia" className="section-more">
              Ver mais <b>→</b>
            </Link>
          </div>
        </section>

        <section className="lead-grid daily-news-grid">
          <LeadStory story={lead} />
          <div className="secondary-stories">
            {secondary.map((s) => (
              <MiniStory key={s.slug} story={s} />
            ))}
          </div>
        </section>

        <section className="section-header">
          <div>
            <p className="eyebrow">Mais recentes</p>
            <h2>O que também aconteceu</h2>
          </div>
          <div>
            <div className="section-header-actions">
              <span>{recent.length} reportagens recentes</span>
              <Link to="/noticias-recentes" className="section-more">
                Ver todas <b>→</b>
              </Link>
            </div>
          </div>
        </section>

        <section className="news-grid">
          {recent.map((s) => (
            <NewsCard key={s.slug} story={s} />
          ))}
        </section>

        <section className="section-header category-header">
          <div>
            <p className="eyebrow">Editorias</p>
            <h2>Encontre o que importa para você</h2>
          </div>
        </section>
        <div className="section-links">
          {sections.map((s) => (
            <Link
              key={s.slug}
              to="/editoria/$section"
              params={{ section: s.slug }}
              className={`section-link ${colorClass[s.slug]}`}
            >
              {s.name}
              <b>→</b>
            </Link>
          ))}
        </div>

        <section className="editorial-band">
          <div>
            <p className="eyebrow">Área restrita</p>
            <h2>Publique com responsabilidade.</h2>
            <p>Um acesso pensado para quem apura, revisa e cuida das notícias de Catanduva.</p>
          </div>
          <Link to="/editorial">
            Entrar na área editorial <b>→</b>
          </Link>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
