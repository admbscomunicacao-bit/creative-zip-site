import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";
const MEDIA_TYPES = new Set(MEDIA_ACCEPT.split(","));
const MAX_MEDIA_SIZE = 25 * 1024 * 1024;

const MAX_IMAGE_SIDE = 1920;
const WEBP_QUALITY = 0.82;

/**
 * Reduz a foto para no máximo 1920 px no maior lado e converte para WebP.
 * Uma foto de celular de 6 MB costuma cair para 300–500 KB, sem perda visível.
 * GIF (animação) e vídeo passam sem mudança. Se o navegador não conseguir, envia o original.
 */
export async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== "function") {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 500 * 1024 && file.type === "image/webp") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export async function uploadArticleMedia(
  original: File,
): Promise<{ url: string; kind: "image" | "video" }> {
  const file = await compressImage(original);
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
  if (signError || !data?.signedUrl)
    throw new Error(signError?.message ?? "Falha ao gerar o link do arquivo.");

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
