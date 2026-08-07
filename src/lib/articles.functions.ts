import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type ArticleStatus = "draft" | "published";

export type Article = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  section: string;
  color: string;
  status: ArticleStatus;
  bodyHtml: string;
  coverUrl: string | null;
  authorId: string;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  section: string;
  color: string;
  status: ArticleStatus;
  body_html: string;
  cover_url: string | null;
  author_id: string;
  author_name: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const toArticle = (row: Row): Article => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  section: row.section,
  color: row.color,
  status: row.status,
  bodyHtml: row.body_html ?? "",
  coverUrl: row.cover_url,
  authorId: row.author_id,
  authorName: row.author_name,
  publishedAt: row.published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const SELECT =
  "id,slug,title,summary,section,color,status,body_html,cover_url,author_id,author_name,published_at,created_at,updated_at";

const sectionColors: Record<string, string> = {
  Cidade: "blue",
  "Política": "red",
  "Serviços": "green",
  Esportes: "yellow",
};

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);

export const listEditorialArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("articles")
      .select(SELECT)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(toArticle);
  });

const articleInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(220),
  summary: z.string().trim().max(600),
  section: z.enum(["Cidade", "Política", "Serviços", "Esportes"]),
  status: z.enum(["draft", "published"]),
  bodyHtml: z.string().max(400000),
  coverUrl: z.string().trim().max(2000).nullable().optional(),
  authorName: z.string().trim().max(160).optional(),
});

export type ArticleInput = z.infer<typeof articleInput>;

export const saveArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ArticleInput) => articleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.status === "published" && !data.title.trim()) {
      throw new Error("Informe o título antes de publicar a reportagem.");
    }

    const payload = {
      title: data.title,
      summary: data.summary,
      section: data.section,
      color: sectionColors[data.section] ?? "blue",
      status: data.status,
      body_html: data.bodyHtml,
      cover_url: data.coverUrl ?? null,
      author_name: data.authorName ?? "",
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("articles")
        .update(payload)
        .eq("id", data.id)
        .select(SELECT)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!updated) throw new Error("Reportagem não encontrada ou sem permissão de edição.");
      return toArticle(updated as Row);
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
      .insert({ ...payload, slug, author_id: userId })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return toArticle(inserted as Row);
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type ReporterRow = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  isAdmin: boolean;
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

    return ((profiles ?? []) as { id: string; full_name: string; email: string; status: string }[])
      .map((p) => ({
        id: p.id,
        fullName: p.full_name || p.email,
        email: p.email,
        status: p.status,
        isAdmin: (roles ?? []).some(
          (r: { user_id: string; role: string }) => r.user_id === p.id && r.role === "admin",
        ),
        articles: (counts ?? []).filter((c: { author_id: string }) => c.author_id === p.id).length,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)) as ReporterRow[];
  });
