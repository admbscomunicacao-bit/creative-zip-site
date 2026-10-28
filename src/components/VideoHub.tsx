import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { useSiteSettings } from "@/hooks/use-site-settings";
import type { ChannelVideo } from "@/lib/site.functions";
import { YOUTUBE_CHANNEL_URL, youtubeThumb, youtubeVideoId } from "@/lib/youtube";

const shortDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        timeZone: "America/Sao_Paulo",
      })
    : "";

/**
 * Faixa do YouTube: a live em destaque quando está no ar; fora dela, o vídeo mais
 * recente e a fila dos anteriores. Sem vídeos ainda, vira convite para o canal.
 */
export function VideoHub({
  videos,
  showAllLink = true,
}: {
  videos: ChannelVideo[];
  showAllLink?: boolean;
}) {
  const { liveActive, liveUrl, liveTitle } = useSiteSettings();
  const liveId = liveActive ? youtubeVideoId(liveUrl) : null;
  const [selected, setSelected] = useState<string | null>(null);

  const featured = liveId
    ? { id: liveId, title: liveTitle || "Ao vivo no Canal Transforma", live: true }
    : videos[0]
      ? { id: videos[0].id, title: videos[0].title, live: false }
      : null;
  const current = selected
    ? { id: selected, title: videos.find((v) => v.id === selected)?.title ?? "", live: false }
    : featured;
  const queue = videos.filter((v) => v.id !== current?.id).slice(0, 4);

  return (
    <section className="video-hub" aria-labelledby="video-hub-title">
      <div className="video-hub-head">
        <div>
          <p className="eyebrow">{liveActive ? "Estamos ao vivo" : "Lives semanais"}</p>
          <h2 id="video-hub-title">Canal Transforma no YouTube</h2>
        </div>
        <div className="video-hub-actions">
          {showAllLink && videos.length > 0 ? (
            <Link to="/videos" className="section-more">
              Todos os vídeos <b>→</b>
            </Link>
          ) : null}
          {current ? (
            <a
              className="yt-subscribe"
              href={`${YOUTUBE_CHANNEL_URL}?sub_confirmation=1`}
              target="_blank"
              rel="noreferrer"
            >
              Inscreva-se no canal
            </a>
          ) : null}
        </div>
      </div>

      {current ? (
        <div className={`video-hub-grid${queue.length ? "" : " is-single"}`}>
          <div className="video-hub-main">
            <YouTubePlayer
              key={current.id}
              id={current.id}
              title={current.title}
              live={current.live}
              autoLoad={Boolean(selected)}
            />
            <h3>{current.title}</h3>
            {current.live && liveUrl ? (
              <a href={liveUrl} target="_blank" rel="noreferrer" className="video-hub-chat">
                Comentar no chat da live <b>→</b>
              </a>
            ) : null}
          </div>
          {queue.length ? (
            <ol className="video-queue" aria-label="Vídeos anteriores">
              {queue.map((v) => (
                <li key={v.id}>
                  <button type="button" onClick={() => setSelected(v.id)}>
                    <img src={youtubeThumb(v.id)} alt="" loading="lazy" decoding="async" />
                    <span>
                      <b>{v.title}</b>
                      <time dateTime={v.publishedAt}>{shortDate(v.publishedAt)}</time>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : (
        <div className="video-hub-empty">
          <p>
            Toda semana o Canal Transforma entra ao vivo para conversar sobre o que acontece em
            Catanduva. Ative o sininho no YouTube para ser avisado quando a próxima live começar.
          </p>
          <a href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noreferrer">
            Abrir o canal no YouTube <b>→</b>
          </a>
        </div>
      )}
    </section>
  );
}
