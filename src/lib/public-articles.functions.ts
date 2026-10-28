import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { sanitizeArticleHtml } from "@/lib/article-html";
import { type Section, type SectionColor, type Story } from "@/data/stories";

export type PublicArticle = {
  slug: string;
  title: string;
  summary: string;
  section: string;
  color: string;
  bodyHtml: string;
  coverUrl: string | null;
  videoUrl: string | null;
  authorName: string;
  publishedAt: string | null;
  updatedAt: string | null;
};

const SELECT =
  "slug,title,summary,section,color,body_html,cover_url,video_url,author_name,published_at,updated_at";
const LIST_SELECT = "slug,title,summary,section,color,cover_url,video_url,published_at";

/** Coluna nova ainda não criada no banco (migração pendente): repete a consulta sem ela. */
const missingVideoColumn = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === "42703" || /video_url/.test(error.message ?? "")));
const withoutVideo = (select: string) => select.replace(",video_url", "");

type Row = {
  slug: string;
  title: string;
  summary: string;
  section: string;
  color: string;
  body_html: string;
  cover_url: string | null;
  video_url: string | null;
  author_name: string;
  published_at: string | null;
  updated_at: string | null;
};

type ListRow = Pick<
  Row,
  "slug" | "title" | "summary" | "section" | "color" | "cover_url" | "video_url" | "published_at"
>;

const toPublic = (row: Row): PublicArticle => ({
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  section: row.section,
  color: row.color,
  bodyHtml: sanitizeArticleHtml(row.body_html ?? ""),
  coverUrl: row.cover_url,
  videoUrl: row.video_url ?? null,
  authorName: row.author_name,
  publishedAt: row.published_at,
  updatedAt: row.updated_at,
});

/** Data no fuso de Catanduva: o servidor roda em UTC. */
export const formatStoryDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      })
    : "";

const toStory = (row: ListRow): Story => ({
  slug: row.slug,
  section: row.section as Section,
  title: row.title,
  summary: row.summary,
  date: formatStoryDate(row.published_at),
  color: row.color as SectionColor,
  image: row.cover_url ?? "",
  ...(row.video_url ? { hasVideo: true } : {}),
});

function publicClient() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const getPublishedArticle = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().trim().max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const fetchRow = (select: string) =>
      publicClient()
        .from("articles")
        .select(select)
        .eq("slug", data.slug)
        .eq("status", "published")
        .maybeSingle();
    let { data: row, error } = await fetchRow(SELECT);
    if (missingVideoColumn(error)) ({ data: row } = await fetchRow(withoutVideo(SELECT)));
    return row ? toPublic(row as unknown as Row) : null;
  });

const listInput = z.object({
  section: z.enum(["Cidade", "Política", "Serviços", "Esportes"]).optional(),
  q: z.string().trim().max(120).optional(),
  exclude: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(60).default(24),
});

/** Escapa curingas do ILIKE para a busca tratar o termo como texto. */
const likeTerm = (q: string) => `%${q.replace(/[\\%_,()]/g, (c) => `\\${c}`)}%`;

/** Lista as reportagens publicadas, mais novas primeiro. */
export const listPublishedStories = createServerFn({ method: "GET" })
  .inputValidator((input: z.input<typeof listInput>) => listInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    let rows: ListRow[] | null = null;
    try {
      const run = (select: string) => {
        let query = publicClient()
          .from("articles")
          .select(select)
          .eq("status", "published")
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(data.limit);
        if (data.section) query = query.eq("section", data.section);
        if (data.exclude) query = query.neq("slug", data.exclude);
        if (data.q)
          query = query.or(`title.ilike.${likeTerm(data.q)},summary.ilike.${likeTerm(data.q)}`);
        return query;
      };
      let { data: found, error } = await run(LIST_SELECT);
      if (missingVideoColumn(error))
        ({ data: found, error } = await run(withoutVideo(LIST_SELECT)));
      if (!error) rows = (found ?? []) as unknown as ListRow[];
    } catch {
      rows = null;
    }

    return { stories: (rows ?? []).map(toStory) };
  });
