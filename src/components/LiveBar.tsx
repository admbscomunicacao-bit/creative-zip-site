import { useSiteSettings } from "@/hooks/use-site-settings";

/** Faixa AO VIVO em todo o portal, ligada pelo painel da redação. */
export function LiveBar() {
  const { liveActive, liveUrl, liveTitle } = useSiteSettings();
  if (!liveActive || !liveUrl) return null;
  return (
    <a className="live-bar" href={liveUrl} target="_blank" rel="noreferrer">
      <span className="live-pill">
        <i aria-hidden="true" />
        Ao vivo
      </span>
      <span className="live-title">{liveTitle || "Estamos ao vivo no YouTube"}</span>
      <span className="live-cta">
        Assistir agora <b>→</b>
      </span>
    </a>
  );
}
