import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sections, stories } from "@/data/stories";

const BASE_URL = "https://www.canaltransforma.com.br";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

async function publishedArticles(): Promise<{ slug: string; published_at: string | null }[]> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return [];
  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase
      .from("articles")
      .select("slug,published_at")
      .eq("status", "published");
    return (data ?? []) as { slug: string; published_at: string | null }[];
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "hourly", priority: "1.0" },
          { path: "/noticias-do-dia", changefreq: "daily", priority: "0.8" },
          { path: "/noticias-recentes", changefreq: "daily", priority: "0.8" },
          ...sections.map((s) => ({
            path: `/editoria/${s.slug}`,
            changefreq: "daily" as const,
            priority: "0.7",
          })),
          ...stories.map((s) => ({
            path: `/noticia/${s.slug}`,
            changefreq: "monthly" as const,
            priority: "0.6",
          })),
        ];

        const seen = new Set(entries.map((e) => e.path));
        for (const article of await publishedArticles()) {
          const path = `/noticia/${article.slug}`;
          if (seen.has(path)) continue;
          seen.add(path);
          entries.push({
            path,
            lastmod: article.published_at
              ? new Date(article.published_at).toISOString()
              : undefined,
            changefreq: "monthly",
            priority: "0.6",
          });
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
