import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AccountStatus = "pending" | "approved" | "blocked";
export type AppRole = "reporter" | "admin";

export type EditorialAccount = {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  status: AccountStatus;
  mfaEnrolledAt: string | null;
  roles: AppRole[];
  isAdmin: boolean;
  mfaVerified: boolean;
};

export type EditorialUserRow = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: AccountStatus;
  mfaEnrolledAt: string | null;
  createdAt: string;
  roles: AppRole[];
};

export type AuditRow = {
  id: string;
  action: string;
  actorId: string | null;
  targetUserId: string | null;
  detail: string;
  createdAt: string;
};

// Ensures the signed-in user has an editorial profile row (status always starts as pending)
// and a default reporter role. Called right after e-mail confirmation.
export const ensureEditorialProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fullName?: string; phone?: string; acceptedTerms?: boolean }) =>
    z
      .object({
        fullName: z.string().trim().max(120).optional(),
        phone: z.string().trim().max(40).optional(),
        acceptedTerms: z.boolean().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const email = typeof claims["email"] === "string" ? (claims["email"] as string) : "";

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from("profiles").insert({
        id: userId,
        email,
        full_name: data.fullName ?? "",
        phone: data.phone ?? null,
        terms_accepted_at: data.acceptedTerms ? new Date().toISOString() : null,
      });
      if (error) throw new Error(error.message);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "reporter" }, { onConflict: "user_id,role" });
      await supabaseAdmin.from("audit_log").insert({
        actor_id: userId,
        target_user_id: userId,
        action: "email_confirmed",
        detail: { email },
      });
    }

    return { ok: true };
  });

export const getMyEditorialAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EditorialAccount | null> => {
    const { supabase, userId, claims } = context;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, bio, avatar_url, status, mfa_enrolled_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) return null;

    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map((r) => r.role as AppRole);

    // Generate a signed URL for the avatar if a storage path is stored.
    let avatarUrl: string | null = null;
    if (profile.avatar_url) {
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 3600);
      avatarUrl = signed?.signedUrl ?? null;
    }

    return {
      userId,
      email: profile.email,
      fullName: profile.full_name,
      phone: profile.phone,
      bio: profile.bio,
      avatarUrl,
      status: profile.status as AccountStatus,
      mfaEnrolledAt: profile.mfa_enrolled_at,
      roles,
      isAdmin: roles.includes("admin"),
      mfaVerified: claims["aal"] === "aal2",
    };
  });

export const updateMyEditorialProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fullName: string; phone?: string; bio?: string; avatarPath?: string }) =>
    z
      .object({
        fullName: z.string().trim().min(3, "Informe seu nome completo").max(120),
        phone: z.string().trim().max(40).optional(),
        bio: z.string().trim().max(1000).optional(),
        avatarPath: z.string().trim().max(500).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // If the avatar path changed, remove the old file from storage.
    const { data: current } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (current?.avatar_url && current.avatar_url !== data.avatarPath) {
      await supabase.storage.from("avatars").remove([current.avatar_url]).catch(() => undefined);
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone ?? null,
        bio: data.bio ?? null,
        avatar_url: data.avatarPath ? data.avatarPath : null,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markMfaEnrolled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ mfa_enrolled_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("audit_log")
      .insert({ actor_id: userId, target_user_id: userId, action: "mfa_enrolled", detail: {} });
    return { ok: true };
  });

async function assertApprovedAdmin(context: {
  supabase: { rpc: unknown };
  userId: string;
  claims: Record<string, unknown>;
}) {
  const amr = Array.isArray(context.claims["amr"]) ? context.claims["amr"] : [];
  const secondFactorVerified =
    context.claims["aal"] === "aal2" ||
    amr.some(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        ["otp", "email", "email_otp", "totp", "mfa/totp"].includes(
          String((entry as Record<string, unknown>)["method"] ?? ""),
        ),
    );
  if (!secondFactorVerified) {
    throw new Error("Confirme o código de verificação antes de acessar a administração.");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("is_editorial_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito a administradores aprovados.");
}

export const listEditorialUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EditorialUserRow[]> => {
    await assertApprovedAdmin(context);
    const { supabase } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, status, mfa_enrolled_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: roleRows } = await supabase.from("user_roles").select("user_id, role");
    return (data ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      phone: p.phone,
      status: p.status as AccountStatus,
      mfaEnrolledAt: p.mfa_enrolled_at,
      createdAt: p.created_at,
      roles: (roleRows ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
    }));
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; status: AccountStatus }) =>
    z
      .object({
        userId: z.string().uuid(),
        status: z.enum(["pending", "approved", "blocked"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertApprovedAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    if (data.status === "blocked") {
      // Revoke every active session so a blocked account loses access immediately.
      await supabaseAdmin.auth.admin.signOut(data.userId, "global").catch(() => undefined);
    }
    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      target_user_id: data.userId,
      action: data.status === "approved" ? "user_approved" : `user_status_${data.status}`,
      detail: { status: data.status },
    });
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: AppRole }) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["reporter", "admin"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertApprovedAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      target_user_id: data.userId,
      action: "user_role_changed",
      detail: { role: data.role },
    });
    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditRow[]> => {
    await assertApprovedAdmin(context);
    const { data, error } = await context.supabase
      .from("audit_log")
      .select("id, action, actor_id, target_user_id, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      actorId: row.actor_id,
      targetUserId: row.target_user_id,
      detail: JSON.stringify(row.detail ?? {}),
      createdAt: row.created_at,
    }));
  });

// Signed-in audit events (signup finished, login succeeded, mfa passed).
export const recordAuthEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { action: string }) =>
    z
      .object({
        action: z.enum(["signup_started", "login_success", "mfa_success", "password_reset_done"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      target_user_id: context.userId,
      action: data.action,
      detail: {},
    });
    return { ok: true };
  });

// Failed logins have no session, so this one is unauthenticated by design.
// It only ever writes a fixed action with a truncated e-mail.
export const recordLoginFailure = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; reason: string }) =>
    z
      .object({
        email: z.string().trim().max(255),
        reason: z.string().trim().max(120),
      })
      .parse(input),
  )
  .handler(async () => {
    // This endpoint is intentionally a no-op. Persisting unauthenticated data lets
    // attackers flood the audit table; real sign-in events are audited after auth.
    return { ok: true };
  });

// Removes an editorial account completely: role, profile and the auth login itself.
export const deleteEditorialUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertApprovedAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("Você não pode excluir a sua própria conta.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("articles").delete().eq("author_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId,
      target_user_id: null,
      action: "user_deleted",
      detail: { userId: data.userId },
    });
    return { ok: true };
  });
