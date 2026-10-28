/** Endereço público do canal, usado nos botões "Inscreva-se" e no rodapé. */
export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@Canaltransformaa";

/**
 * Extrai o ID de um vídeo do YouTube a partir de qualquer formato de link
 * (watch, youtu.be, shorts, live, embed). Retorna null se não for YouTube.
 */
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www\.|m\.|music\.)/, "");
  const valid = (id: string | null | undefined) =>
    id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  if (host === "youtu.be") return valid(parsed.pathname.slice(1).split("/")[0]);
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  const v = parsed.searchParams.get("v");
  if (v) return valid(v);
  const [, kind, id] = parsed.pathname.split("/");
  if (kind && ["shorts", "live", "embed"].includes(kind)) return valid(id);
  return null;
}

/** Player sem cookies de rastreamento até a pessoa dar o play. */
export const youtubeEmbedUrl = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
