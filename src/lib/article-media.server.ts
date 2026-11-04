/**
 * Limpeza do bucket `article-media` quando matérias são apagadas.
 * Os arquivos são servidos por link assinado (`.../object/sign/article-media/<caminho>?token=`),
 * então o caminho é lido das URLs gravadas na matéria (capa, vídeo e corpo do texto).
 */

type MediaRow = {
  cover_url: string | null;
  video_url: string | null;
  body_html: string | null;
};

const MEDIA_PATH = /\/article-media\/([A-Za-z0-9_\-/.]+?)(?:\?|"|'|\s|$)/g;

export function articleMediaPaths(rows: MediaRow[]): string[] {
  const found = new Set<string>();
  for (const row of rows) {
    const text = [row.cover_url, row.video_url, row.body_html].filter(Boolean).join(" ");
    for (const match of text.matchAll(MEDIA_PATH)) {
      const path = decodeURIComponent(match[1] ?? "");
      if (path && !path.includes("..")) found.add(path);
    }
  }
  return [...found];
}

/**
 * Apaga do bucket os arquivos que nenhuma matéria restante usa.
 * Chamar depois de apagar as matérias. Falha aqui nunca derruba a exclusão.
 */
export async function removeOrphanArticleMedia(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orphans: string[] = [];
    for (const path of paths) {
      const pattern = `%article-media/${path}%`;
      const { count } = await supabaseAdmin
        .from("articles")
        .select("id", { count: "exact", head: true })
        .or(`cover_url.like.${pattern},video_url.like.${pattern},body_html.like.${pattern}`);
      if (!count) orphans.push(path);
    }
    if (orphans.length) await supabaseAdmin.storage.from("article-media").remove(orphans);
  } catch (error) {
    console.error("Falha ao limpar arquivos de matérias apagadas", error);
  }
}
