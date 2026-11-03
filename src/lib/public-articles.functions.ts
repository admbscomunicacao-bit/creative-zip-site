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
  subtitle: string;
  coverCaption: string;
  coverCredit: string;
  coverAlt: string;
  tags: string[];
  correctionNote: string | null;
  correctedAt: string | null;
};

const SELECT =
  "slug,title,subtitle,summary,section,color,body_html,cover_url,cover_caption,cover_credit,cover_alt,video_url,tags,author_name,published_at,updated_at,correction_note,corrected_at";
const LIST_SELECT = "slug,title,summary,section,color,cover_url,video_url,published_at";

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
  subtitle?: string | null;
  cover_caption?: string | null;
  cover_credit?: string | null;
  cover_alt?: string | null;
  tags?: string[] | null;
  correction_note?: string | null;
  corrected_at?: string | null;
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
  subtitle: row.subtitle ?? "",
  coverCaption: row.cover_caption ?? "",
  coverCredit: row.cover_credit ?? "",
  coverAlt: row.cover_alt ?? "",
  tags: row.tags ?? [],
  correctionNote: row.correction_note ?? null,
  correctedAt: row.corrected_at ?? null,
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
    const { data: row } = await fetchRow(SELECT);
    return row ? toPublic(row as unknown as Row) : null;
  });

const listInput = z.object({
  section: z.enum(["Cidade", "Política", "Serviços", "Esportes"]).optional(),
  q: z.string().trim().max(120).optional(),
  exclude: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(60).default(24),
  /** Quantas já foram mostradas (para o botão "carregar mais"). */
  offset: z.number().int().min(0).max(5000).default(0),
});

/** Termo de busca: tira curingas e aspas e põe entre aspas para vírgulas e parênteses não quebrarem o filtro. */
const likeTerm = (q: string) => `"%${q.replace(/[\\%_"*]/g, " ").trim()}%"`;

/** Lista as reportagens publicadas, mais novas primeiro. */
export const listPublishedStories = createServerFn({ method: "GET" })
  .inputValidator((input: z.input<typeof listInput>) => listInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    let rows: ListRow[] | null = null;
    try {
      let query = publicClient()
        .from("articles")
        .select(LIST_SELECT)
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        // Um a mais para saber se ainda há o que carregar.
        .range(data.offset, data.offset + data.limit);
      if (data.section) query = query.eq("section", data.section);
      if (data.exclude) query = query.neq("slug", data.exclude);
      if (data.q) {
        const term = likeTerm(data.q);
        const tag = data.q
          .toLowerCase()
          .replace(/[^\p{L}\p{N} -]/gu, "")
          .trim();
        const filters = [`title.ilike.${term}`, `summary.ilike.${term}`, `body_html.ilike.${term}`];
        if (tag) filters.push(`tags.cs.{"${tag}"}`);
        query = query.or(filters.join(","));
      }
      const { data: found, error } = await query;
      if (!error) rows = (found ?? []) as unknown as ListRow[];
    } catch {
      rows = null;
    }

    const list = rows ?? [];
    return {
      stories: list.slice(0, data.limit).map(toStory),
      hasMore: list.length > data.limit,
    };
  });

// Uma leitura por IP e matéria a cada 30 min (por instância), para não inflar o número.
const viewHits = new Map<string, number>();

/** Soma uma leitura (chamado pela página da matéria depois que ela abre no navegador). */
export const countArticleView = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const agent = getRequestHeader("user-agent") ?? "";
      if (/bot|crawl|spider|preview|facebookexternalhit|whatsapp/i.test(agent)) return { ok: true };
      const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "?";
      const key = `${ip}:${data.slug}`;
      const last = viewHits.get(key) ?? 0;
      if (Date.now() - last < 30 * 60_000) return { ok: true };
      viewHits.set(key, Date.now());
      if (viewHits.size > 5000) viewHits.clear();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("count_article_view", { _slug: data.slug });
    } catch {
      // Contagem é secundária: nunca atrapalha a leitura.
    }
    return { ok: true };
  });

/** As mais lidas dos últimos 7 dias, já no formato dos cards. */
export const listMostRead = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = publicClient();
    const { data: top } = await db.rpc("most_read_articles", { _days: 7, _limit: 5 });
    const ranking = (top ?? []) as { slug: string; views: number }[];
    if (!ranking.length) return { stories: [] as Story[] };
    const { data: rows } = await db
      .from("articles")
      .select(LIST_SELECT)
      .eq("status", "published")
      .in(
        "slug",
        ranking.map((r) => r.slug),
      );
    const bySlug = new Map(((rows ?? []) as unknown as ListRow[]).map((r) => [r.slug, r]));
    const stories = ranking
      .map((r) => bySlug.get(r.slug))
      .filter((r): r is ListRow => Boolean(r))
      .map(toStory);
    return { stories };
  } catch {
    return { stories: [] as Story[] };
  }
});
