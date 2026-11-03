import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeArticleHtml } from "@/lib/article-html";
import { youtubeVideoId } from "@/lib/youtube";
import { z } from "zod";

/** draft = rascunho · review = enviada para revisão · published = publicada (ou agendada). */
export type ArticleStatus = "draft" | "review" | "published";

export type Article = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  section: string;
  color: string;
  status: ArticleStatus;
  bodyHtml: string;
  coverUrl: string | null;
  coverCaption: string;
  coverCredit: string;
  coverAlt: string;
  videoUrl: string | null;
  tags: string[];
  authorId: string;
  authorName: string;
  publishedAt: string | null;
  submittedAt: string | null;
  reviewNote: string | null;
  correctionNote: string | null;
  correctedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Leituras nos últimos 30 dias (só publicadas). */
  views?: number;
};

type Row = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string;
  section: string;
  color: string;
  status: ArticleStatus;
  body_html: string;
  cover_url: string | null;
  cover_caption: string | null;
  cover_credit: string | null;
  cover_alt: string | null;
  video_url: string | null;
  tags: string[] | null;
  author_id: string;
  author_name: string;
  published_at: string | null;
  submitted_at: string | null;
  review_note: string | null;
  correction_note: string | null;
  corrected_at: string | null;
  created_at: string;
  updated_at: string;
};

const toArticle = (row: Row): Article => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  subtitle: row.subtitle ?? "",
  summary: row.summary,
  section: row.section,
  color: row.color,
  status: row.status,
  bodyHtml: row.body_html ?? "",
  coverUrl: row.cover_url,
  coverCaption: row.cover_caption ?? "",
  coverCredit: row.cover_credit ?? "",
  coverAlt: row.cover_alt ?? "",
  videoUrl: row.video_url ?? null,
  tags: row.tags ?? [],
  authorId: row.author_id,
  authorName: row.author_name,
  publishedAt: row.published_at,
  submittedAt: row.submitted_at,
  reviewNote: row.review_note,
  correctionNote: row.correction_note,
  correctedAt: row.corrected_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const SELECT =
  "id,slug,title,subtitle,summary,section,color,status,body_html,cover_url,cover_caption,cover_credit,cover_alt,video_url,tags,author_id,author_name,published_at,submitted_at,review_note,correction_note,corrected_at,created_at,updated_at";

const sectionColors: Record<string, string> = {
  Cidade: "blue",
  Política: "red",
  Serviços: "green",
  Esportes: "yellow",
};

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);

/** Matéria publicada com data no futuro: ainda não aparece no portal. */
export const isScheduled = (a: Pick<Article, "status" | "publishedAt">) =>
  a.status === "published" &&
  Boolean(a.publishedAt) &&
  new Date(a.publishedAt!).getTime() > Date.now();

export const listEditorialArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("articles")
      .select(SELECT)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const articles = ((data ?? []) as unknown as Row[]).map(toArticle);

    // Leituras dos últimos 30 dias (tabela nova: se ainda não existir, segue sem números).
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const { data: views } = await context.supabase
      .from("article_views")
      .select("article_id,views")
      .gte("day", since);
    if (views?.length) {
      const total = new Map<string, number>();
      for (const v of views) total.set(v.article_id, (total.get(v.article_id) ?? 0) + v.views);
      for (const a of articles) if (total.has(a.id)) a.views = total.get(a.id)!;
    }
    return articles;
  });

const articleInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(220),
  subtitle: z.string().trim().max(300).default(""),
  summary: z.string().trim().max(600),
  section: z.enum(["Cidade", "Política", "Serviços", "Esportes"]),
  status: z.enum(["draft", "review", "published"]),
  bodyHtml: z.string().max(400000),
  coverUrl: z.string().trim().max(2000).nullable().optional(),
  coverCaption: z.string().trim().max(300).default(""),
  coverCredit: z.string().trim().max(120).default(""),
  coverAlt: z.string().trim().max(300).default(""),
  videoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || youtubeVideoId(v), "Cole um link de vídeo do YouTube válido.")
    .nullable()
    .optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  authorName: z.string().trim().max(160).optional(),
  /** Só editor/admin: data e hora de publicação (agendamento). Vazio = agora. */
  publishAt: z.string().datetime({ offset: true }).nullable().optional(),
  /** Só editor/admin: observação ao devolver a matéria para o repórter. */
  reviewNote: z.string().trim().max(1000).nullable().optional(),
  /** Só editor/admin: correção pública numa matéria já publicada. */
  correctionNote: z.string().trim().max(600).nullable().optional(),
});

export type ArticleInput = z.input<typeof articleInput>;

export const saveArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ArticleInput) => articleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: canPublish } = await supabase.rpc("is_editorial_editor", { _user_id: userId });
    const isEditor = canPublish === true;

    if (data.status === "published" && !isEditor) {
      throw new Error("Só editores publicam. Envie a matéria para revisão.");
    }
    if (data.status !== "draft" && !data.title.trim()) {
      throw new Error("Informe o título antes de enviar ou publicar.");
    }
    if (data.status !== "draft" && !data.summary.trim()) {
      throw new Error(
        "Escreva o resumo antes de enviar ou publicar: ele aparece nos cards e no WhatsApp.",
      );
    }

    const payload: Record<string, unknown> = {
      title: data.title,
      subtitle: data.subtitle,
      summary: data.summary,
      section: data.section,
      color: sectionColors[data.section] ?? "blue",
      status: data.status,
      body_html: sanitizeArticleHtml(data.bodyHtml),
      cover_url: data.coverUrl ?? null,
      cover_caption: data.coverCaption,
      cover_credit: data.coverCredit,
      cover_alt: data.coverAlt,
      tags: Array.from(new Set(data.tags.map((t) => t.toLowerCase()))),
      author_name: data.authorName ?? "",
      ...(data.videoUrl !== undefined ? { video_url: data.videoUrl || null } : {}),
    };
    if (isEditor) {
      if (data.publishAt !== undefined) payload["published_at"] = data.publishAt;
      if (data.reviewNote !== undefined) payload["review_note"] = data.reviewNote || null;
      if (data.correctionNote !== undefined)
        payload["correction_note"] = data.correctionNote || null;
    }
    // Ao publicar sem data marcada, a hora é a de agora (o banco preenche).
    if (data.status === "published" && isEditor && !data.publishAt) payload["published_at"] = null;

    if (data.id) {
      if (data.status === "published" && isEditor && !data.publishAt) {
        // Não apaga a data de quem já estava publicada: só preenche quando entra agora.
        const { data: current } = await supabase
          .from("articles")
          .select("status,published_at")
          .eq("id", data.id)
          .maybeSingle();
        if (current?.status === "published") payload["published_at"] = current.published_at;
      }
      const { data: updated, error } = await supabase
        .from("articles")
        .update(payload as never)
        .eq("id", data.id)
        .select(SELECT)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!updated) {
        throw new Error(
          "Você não pode alterar esta matéria. Matéria publicada só é alterada por um editor.",
        );
      }
      return toArticle(updated as unknown as Row);
    }

    const base = slugify(data.title) || "reportagem";
    let slug = base;
    for (let i = 0; i < 30; i += 1) {
      const { data: clash } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${base}-${i + 2}`;
    }

    const { data: inserted, error } = await supabase
      .from("articles")
      .insert({ ...payload, slug, author_id: userId } as never)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return toArticle(inserted as unknown as Row);
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: removed, error } = await context.supabase
      .from("articles")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!removed?.length) {
      throw new Error(
        "Você não pode excluir esta matéria. Matéria publicada só o administrador exclui.",
      );
    }
    return { ok: true };
  });

export type ReporterRow = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  role: "reporter" | "editor" | "admin";
  articles: number;
};

export const listNewsroomReporters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id,full_name,email,status");
    if (error) throw new Error(error.message);
    const { data: roles } = await supabase.from("user_roles").select("user_id,role");
    const { data: counts } = await supabase.from("articles").select("author_id");

    const roleOf = (id: string): ReporterRow["role"] => {
      const mine = (roles ?? [])
        .filter((r: { user_id: string; role: string }) => r.user_id === id)
        .map((r: { role: string }) => r.role);
      return mine.includes("admin") ? "admin" : mine.includes("editor") ? "editor" : "reporter";
    };

    return ((profiles ?? []) as { id: string; full_name: string; email: string; status: string }[])
      .map((p) => ({
        id: p.id,
        fullName: p.full_name || p.email,
        email: p.email,
        status: p.status,
        role: roleOf(p.id),
        articles: (counts ?? []).filter((c: { author_id: string }) => c.author_id === p.id).length,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)) as ReporterRow[];
  });
