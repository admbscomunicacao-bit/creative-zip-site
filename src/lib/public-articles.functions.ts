import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { sanitizeArticleHtml } from "@/lib/article-html";

export type PublicArticle = {
  slug: string;
  title: string;
  summary: string;
  section: string;
  color: string;
  bodyHtml: string;
  coverUrl: string | null;
  authorName: string;
  publishedAt: string | null;
};

const SELECT = "slug,title,summary,section,color,body_html,cover_url,author_name,published_at";

type Row = {
  slug: string;
  title: string;
  summary: string;
  section: string;
  color: string;
  body_html: string;
  cover_url: string | null;
  author_name: string;
  published_at: string | null;
};

const toPublic = (row: Row): PublicArticle => ({
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  section: row.section,
  color: row.color,
  bodyHtml: sanitizeArticleHtml(row.body_html ?? ""),
  coverUrl: row.cover_url,
  authorName: row.author_name,
  publishedAt: row.published_at,
});

function publicClient() {
  return createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const getPublishedArticle = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().trim().max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row } = await publicClient()
      .from("articles")
      .select(SELECT)
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return row ? toPublic(row as Row) : null;
  });
