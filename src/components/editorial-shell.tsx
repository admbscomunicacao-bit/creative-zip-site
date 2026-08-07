import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { getMyEditorialAccount, type EditorialAccount } from "@/lib/editorial.functions";

export function EditorialShell({
  eyebrow,
  title,
  intro,
  children,
  backTo = "/",
  backLabel = "← Voltar para o portal",
}: {
  eyebrow?: string;
  title?: string;
  intro?: ReactNode;
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <>
      <SiteHeader />
      <section className="login-shell">
        <Link to={backTo} className="back-link">
          {backLabel}
        </Link>
        {title ? (
          <div className="login-intro">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h1>{title}</h1>
            {intro ? <p>{intro}</p> : null}
          </div>
        ) : null}
        {children}
      </section>
      <SiteFooter />
    </>
  );
}

export function useEditorialAccount() {
  const fetchAccount = useServerFn(getMyEditorialAccount);
  return useQuery({
    queryKey: ["editorial-account"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return null;
      return (await fetchAccount()) as EditorialAccount | null;
    },
    retry: false,
    staleTime: 0,
  });
}

export function nextEditorialStep(account: EditorialAccount | null): string {
  if (!account) return "/editorial";
  if (account.status === "blocked") return "/editorial/perfil";
  if (account.status === "pending") return "/editorial/perfil";
  if (!account.mfaEnrolledAt) return "/editorial/mfa";
  if (!account.mfaVerified) return "/editorial";
  return "/editorial/redacao";
}

/** Client-side convenience redirect. Real enforcement lives in RLS + server functions. */
export function useRequireEditorialAccount(options: { requireEditorialAccess?: boolean } = {}) {
  const navigate = useNavigate();
  const query = useEditorialAccount();
  const account = query.data ?? null;

  useEffect(() => {
    if (query.isLoading) return;
    if (!account) {
      void navigate({ to: "/editorial" });
      return;
    }
    if (options.requireEditorialAccess) {
      const target = nextEditorialStep(account);
      if (target !== "/editorial/redacao") void navigate({ to: target });
    }
  }, [account, query.isLoading, navigate, options.requireEditorialAccess]);

  return query;
}

export async function editorialSignOut() {
  await supabase.auth.signOut();
}
