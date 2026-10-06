import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { brand } from "../lib/brand";

function NotFoundComponent() {
  return (
    <main className="status-page">
      <img src={brand.icon} alt="" width={120} height={120} />
      <p className="status-code">404</p>
      <h1>Não encontramos esta página</h1>
      <p>
        O endereço pode ter mudado ou a reportagem saiu do ar. As notícias de hoje continuam na
        capa.
      </p>
      <Link to="/" className="status-action">
        Voltar para a capa <b>→</b>
      </Link>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <main className="status-page">
      <img src={brand.icon} alt="" width={120} height={120} />
      <h1>Esta página não carregou</h1>
      <p>Houve uma falha do nosso lado. Tente de novo em instantes ou volte para a capa.</p>
      <div className="status-actions">
        <button
          type="button"
          className="status-action"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Tentar de novo
        </button>
        <a href="/" className="status-action is-secondary">
          Voltar para a capa
        </a>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Canal Transforma | Jornalismo local de Catanduva" },
      { name: "theme-color", content: "#4A72B6" },
      {
        name: "description",
        content:
          "Notícias de Catanduva com apuração e contexto: cidade, política, serviços e esportes.",
      },
      { name: "author", content: "Canal Transforma" },
      { property: "og:title", content: "Canal Transforma" },
      {
        property: "og:description",
        content: "Jornalismo local com clareza e responsabilidade.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Canal Transforma" },
      { property: "og:locale", content: "pt_BR" },
      {
        property: "og:image",
        content: "https://www.canaltransforma.com.br/brand/og-canal-transforma.png",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: "https://www.canaltransforma.com.br/brand/og-canal-transforma.png",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/brand/apple-touch-icon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": "https://www.canaltransforma.com.br/#website",
              name: "Canal Transforma",
              url: "https://www.canaltransforma.com.br",
              inLanguage: "pt-BR",
              description:
                "Notícias de Catanduva com apuração e contexto: cidade, política, serviços e esportes.",
              publisher: { "@id": "https://www.canaltransforma.com.br/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://www.canaltransforma.com.br/busca?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "NewsMediaOrganization",
              "@id": "https://www.canaltransforma.com.br/#organization",
              name: "Canal Transforma",
              url: "https://www.canaltransforma.com.br",
              logo: {
                "@type": "ImageObject",
                url: "https://www.canaltransforma.com.br/brand/icone-app-512.png",
              },
              areaServed: "Catanduva, SP, Brasil",
            },
          ],
        }),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Link de acesso do e-mail pode cair na home com o token na URL: leva para a área editorial.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    const search = window.location.search.replace(/^\?/, "");
    const params = new URLSearchParams(hash || search);
    const hasToken =
      params.has("access_token") || params.has("token_hash") || params.get("type") === "magiclink";
    if (!hasToken) return;
    if (window.location.pathname.startsWith("/editorial")) return;
    window.location.replace(`/editorial/entrar${window.location.search}${window.location.hash}`);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
