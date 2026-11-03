import type { ReactNode } from "react";
import { YouTubePlayer } from "@/components/YouTubePlayer";

export type ArticleViewData = {
  section: string;
  color: string;
  title: string;
  subtitle: string;
  summary: string;
  coverUrl: string | null;
  coverAlt: string;
  coverCaption: string;
  coverCredit: string;
  videoId: string | null;
  author: string;
  authorLink?: ReactNode;
  dateLabel: string;
  updatedLabel?: string;
  bodyHtml: string;
  tags: string[];
  correctionNote?: string | null;
  correctedLabel?: string;
};

/**
 * Corpo da matéria, igual no portal e na pré-visualização da redação.
 * `top` entra antes do texto (compartilhar), `bottom` depois das tags.
 */
export function ArticleView({
  data,
  top,
  bottom,
  backLink,
}: {
  data: ArticleViewData;
  top?: ReactNode;
  bottom?: ReactNode;
  backLink?: ReactNode;
}) {
  return (
    <article className="article-shell">
      {backLink}
      <p className={`story-section section-${data.color}`}>{data.section}</p>
      <h1>{data.title || "Sem título"}</h1>
      {data.subtitle ? <p className="article-subtitle">{data.subtitle}</p> : null}
      {data.summary ? <p className="article-summary">{data.summary}</p> : null}
      {data.videoId ? (
        <div className="article-video">
          <YouTubePlayer id={data.videoId} title={data.title} />
        </div>
      ) : data.coverUrl ? (
        <figure className={`article-art ${data.color}`}>
          <img src={data.coverUrl} alt={data.coverAlt || data.title} />
          {data.coverCaption || data.coverCredit ? (
            <figcaption>
              {data.coverCaption}
              {data.coverCredit ? (
                <span className="article-credit">Foto: {data.coverCredit}</span>
              ) : null}
            </figcaption>
          ) : null}
        </figure>
      ) : null}
      <div className="article-meta">
        <span>{data.authorLink ?? data.author}</span>
        <div>
          <time>{data.dateLabel}</time>
          {data.updatedLabel ? <time>Atualizado em {data.updatedLabel}</time> : null}
        </div>
      </div>
      {top}
      <div className="article-body">
        <div
          className="story-text-block article-rich"
          dangerouslySetInnerHTML={{ __html: data.bodyHtml }}
        />
      </div>
      {data.correctionNote ? (
        <aside className="article-correction" aria-label="Correção">
          <b>Correção{data.correctedLabel ? ` (${data.correctedLabel})` : ""}:</b>{" "}
          {data.correctionNote}
        </aside>
      ) : null}
      {data.tags.length ? (
        <ul className="article-tags" aria-label="Assuntos">
          {data.tags.map((t) => (
            <li key={t}>
              <a href={`/busca?q=${encodeURIComponent(t)}`}>{t}</a>
            </li>
          ))}
        </ul>
      ) : null}
      {bottom}
    </article>
  );
}
