import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StoryCard, SectionTitle } from "@/components/StoryCard";
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
    ],
  }),
  component: Home,
});

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

  return (
    <>
      <SiteHeader />
      <main className="shell">
        <section className="carousel">
          <img className="cover" src={active.image} alt="" />
          <div className="shade" />
          <div className="carousel-content">
            <p className="eyebrow">Em destaque</p>
            <span className={`tag ${active.color}`}>{active.section}</span>
            <h1>{active.title}</h1>
            <p>{active.summary}</p>
            <Link
              to="/noticia/$slug"
              params={{ slug: active.slug }}
              className="white-button"
            >
              Ler reportagem <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <span className="slide-number">{String(index + 1).padStart(2, "0")}</span>
          <div className="carousel-nav">
            <button
              aria-label="Destaque anterior"
              onClick={() => setIndex((index - 1 + featured.length) % featured.length)}
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              aria-label="Próximo destaque"
              onClick={() => setIndex((index + 1) % featured.length)}
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="dots">
            {featured.map((s, i) => (
              <button
                key={s.slug}
                aria-label={`Ir para destaque ${i + 1}`}
                className={i === index ? "active" : ""}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </section>

        <SectionTitle eyebrow="Seleção diária" title="Notícias do dia" />
        <section className="daily">
          <StoryCard story={lead} />
          <div>
            {daily.slice(1).map((s) => (
              <StoryCard story={s} small key={s.slug} />
            ))}
          </div>
        </section>

        <SectionTitle eyebrow="Mais recentes" title="O que também aconteceu" />
        <section className="grid">
          {stories.slice(4).map((s) => (
            <StoryCard story={s} key={s.slug} />
          ))}
        </section>

        <SectionTitle eyebrow="Editorias" title="Encontre o que importa para você" />
        <section className="sections">
          {sections.map((s) => (
            <Link
              key={s.slug}
              to="/editoria/$section"
              params={{ section: s.slug }}
              className={`section-button ${s.color}`}
            >
              {s.name}
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          ))}
        </section>

        <section className="editorial">
          <div>
            <p className="eyebrow">Área restrita</p>
            <h2>Publique com responsabilidade.</h2>
            <p>Um acesso pensado para quem apura, revisa e cuida das notícias de Catanduva.</p>
          </div>
          <Link to="/editorial">
            Entrar na área editorial <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
