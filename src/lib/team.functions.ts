// Equipe pública do portal: expediente e página de cada autor.
// Só nome, papel, bio e foto de contas aprovadas. Nunca e-mail ou telefone.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { slugify } from "@/lib/articles.functions";
import { formatStoryDate } from "@/lib/public-articles.functions";
import type { SectionColor, Story, Section } from "@/data/stories";

export type TeamRole = "reporter" | "editor" | "admin";

export type TeamMember = {
  slug: string;
  name: string;
  role: TeamRole;
  bio: string;
  avatarUrl: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function loadTeam(): Promise<(TeamMember & { id: string })[]> {
  const db = await admin();
  const { data: profiles } = await db
    .from("profiles")
    .select("id,full_name,bio,avatar_url")
    .eq("status", "approved");
  const { data: roles } = await db.from("user_roles").select("user_id,role");
  const rows = ((profiles ?? []) as ProfileRow[]).filter((p) => p.full_name?.trim());

  const roleOf = (id: string): TeamRole => {
    const mine = (roles ?? []).filter((r) => r.user_id === id).map((r) => String(r.role));
    return mine.includes("admin") ? "admin" : mine.includes("editor") ? "editor" : "reporter";
  };

  const withPhotos = await Promise.all(
    rows.map(async (p) => {
      let avatarUrl: string | null = null;
      if (p.avatar_url) {
        const { data } = await db.storage.from("avatars").createSignedUrl(p.avatar_url, 86_400);
        avatarUrl = data?.signedUrl ?? null;
      }
      return {
        id: p.id,
        slug: slugify(p.full_name),
        name: p.full_name.trim(),
        role: roleOf(p.id),
        bio: p.bio?.trim() ?? "",
        avatarUrl,
      };
    }),
  );
  const order: Record<TeamRole, number> = { admin: 0, editor: 1, reporter: 2 };
  return withPhotos.sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name));
}

/** Expediente: quem faz o Canal Transforma. */
export const listPublicTeam = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return (await loadTeam()).map(({ id: _id, ...member }) => member);
  } catch {
    return [] as TeamMember[];
  }
});

/** Página do autor: perfil e matérias publicadas. */
export const getPublicAuthor = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().trim().max(90) }).parse(input),
  )
  .handler(async ({ data }) => {
    const team = await loadTeam().catch(() => []);
    const person = team.find((m) => m.slug === data.slug);
    if (!person) return null;
    const db = await admin();
    const { data: rows } = await db
      .from("articles")
      .select("slug,title,summary,section,color,cover_url,video_url,published_at")
      .eq("author_id", person.id)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(48);
    const stories: Story[] = (rows ?? []).map((r) => ({
      slug: r.slug,
      section: r.section as Section,
      title: r.title,
      summary: r.summary,
      date: formatStoryDate(r.published_at),
      color: r.color as SectionColor,
      image: r.cover_url ?? "",
      ...(r.video_url ? { hasVideo: true } : {}),
    }));
    const { id: _id, ...member } = person;
    return { member, stories };
  });

/** Slug do autor a partir do nome gravado na matéria. */
export const authorSlug = (name: string) => slugify(name);

/** Endereço da página do autor de uma matéria publicada (null se a conta não estiver aprovada). */
export const getArticleAuthorSlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.string().trim().max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const db = await admin();
      const { data: article } = await db
        .from("articles")
        .select("author_id")
        .eq("slug", data.slug)
        .eq("status", "published")
        .maybeSingle();
      if (!article?.author_id) return null;
      const { data: profile } = await db
        .from("profiles")
        .select("full_name,status")
        .eq("id", article.author_id)
        .maybeSingle();
      return profile?.status === "approved" && profile.full_name?.trim()
        ? slugify(profile.full_name)
        : null;
    } catch {
      return null;
    }
  });
