import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";
const MEDIA_TYPES = new Set(MEDIA_ACCEPT.split(","));
const MAX_MEDIA_SIZE = 25 * 1024 * 1024;

export async function uploadArticleMedia(file: File): Promise<{ url: string; kind: "image" | "video" }> {
  if (!MEDIA_TYPES.has(file.type)) {
    throw new Error("Formato não aceito. Use JPG, PNG, WEBP, GIF, MP4 ou WEBM.");
  }
  if (!file.size || file.size > MAX_MEDIA_SIZE) {
    throw new Error("Arquivo muito grande. O limite é 25 MB.");
  }
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sessão expirada. Entre novamente.");

  const extByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  const ext = extByType[file.type];
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("article-media")
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw new Error(error.message);

  const { data, error: signError } = await supabase.storage
    .from("article-media")
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "Falha ao gerar o link do arquivo.");

  return { url: data.signedUrl, kind: file.type.startsWith("video") ? "video" : "image" };
}

export function pickFiles(multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = MEDIA_ACCEPT;
    input.multiple = multiple;
    input.onchange = () => resolve(input.files ? Array.from(input.files) : []);
    input.click();
  });
}
