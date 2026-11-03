import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://canaltransforma.com.br";

const escapeXml = (v: string) =>
  v.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );

/** Sitemap do Google Notícias: só matérias publicadas nos últimos 2 dias (regra do Google). */
export const Route = createFileRoute("/news-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let rows: { slug: string; title: string; published_at: string; tags: string[] | null }[] =
          [];
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (url && key) {
          try {
            const db = createClient(url, key, {
              auth: { persistSession: false, autoRefreshToken: false },
            });
            const { data } = await db
              .from("articles")
              .select("slug,title,published_at,tags")
              .eq("status", "published")
              .gte("published_at", new Date(Date.now() - 2 * 86_400_000).toISOString())
              .lte("published_at", new Date().toISOString())
              .order("published_at", { ascending: false })
              .limit(1000);
            rows = (data ?? []) as typeof rows;
          } catch {
            rows = [];
          }
        }
        const items = rows.map((r) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}/noticia/${escapeXml(r.slug)}</loc>`,
            "    <news:news>",
            "      <news:publication>",
            "        <news:name>Canal Transforma</news:name>",
            "        <news:language>pt</news:language>",
            "      </news:publication>",
            `      <news:publication_date>${new Date(r.published_at).toISOString()}</news:publication_date>`,
            `      <news:title>${escapeXml(r.title)}</news:title>`,
            r.tags?.length
              ? `      <news:keywords>${escapeXml(r.tags.join(", "))}</news:keywords>`
              : null,
            "    </news:news>",
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n"),
        );
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
          ...items,
          "</urlset>",
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
