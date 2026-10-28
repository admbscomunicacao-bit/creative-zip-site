import { useState } from "react";
import { Play } from "lucide-react";
import { youtubeEmbedUrl, youtubeThumb } from "@/lib/youtube";

/**
 * Mostra a miniatura e só carrega o player do YouTube no clique:
 * a página não paga os ~500 KB do player para quem não vai assistir.
 */
export function YouTubePlayer({
  id,
  title,
  live = false,
  autoLoad = false,
}: {
  id: string;
  title: string;
  live?: boolean;
  autoLoad?: boolean;
}) {
  const [active, setActive] = useState(autoLoad);
  return (
    <div className="yt-player">
      {active ? (
        <iframe
          src={`${youtubeEmbedUrl(id)}&autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" className="yt-poster" onClick={() => setActive(true)}>
          <img src={youtubeThumb(id)} alt="" loading="lazy" decoding="async" />
          {live ? (
            <span className="live-pill">
              <i aria-hidden="true" />
              Ao vivo
            </span>
          ) : null}
          <span className="yt-play" aria-hidden="true">
            <Play size={26} fill="currentColor" />
          </span>
          <span className="sr-only">Assistir: {title}</span>
        </button>
      )}
    </div>
  );
}
