import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/** Moldura das páginas institucionais (Quem somos, Expediente, Política editorial...). */
export function InfoPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <article className="article-shell legal-page">
        <Link to="/" className="back-link">
          ← Voltar para a capa
        </Link>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="article-summary">{intro}</p>
        <div className="article-body">{children}</div>
        <nav className="info-nav" aria-label="Sobre o Canal">
          <Link to="/quem-somos">Quem somos</Link>
          <Link to="/politica-editorial">Política editorial</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/termos">Termos de uso</Link>
        </nav>
      </article>
      <SiteFooter />
    </>
  );
}

export const infoHead = (path: string, title: string, description: string) => ({
  meta: [
    { title: `${title} | Canal Transforma` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} | Canal Transforma` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `https://canaltransforma.com.br${path}` },
  ],
  links: [{ rel: "canonical", href: `https://canaltransforma.com.br${path}` }],
});
