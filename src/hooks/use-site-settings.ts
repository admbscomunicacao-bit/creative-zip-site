import { useRouterState } from "@tanstack/react-router";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site.functions";

/** Configurações do portal carregadas uma vez no layout raiz (com cache de 1 minuto). */
export function useSiteSettings(): SiteSettings {
  const settings = useRouterState({
    select: (state) => state.matches[0]?.loaderData as SiteSettings | undefined,
  });
  return settings ?? DEFAULT_SETTINGS;
}
