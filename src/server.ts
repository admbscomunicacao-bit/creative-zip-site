import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// Public (non-secret) backend settings: make sure server code always finds them,
// even when the deployed runtime did not receive the bindings.
function ensurePublicSupabaseEnv(env: unknown) {
  if (typeof process === "undefined" || !process.env) return;
  const bindings = (env ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (typeof bindings[k] === "string" ? (bindings[k] as string) : undefined);
  process.env['SUPABASE_URL'] ||=
    pick("SUPABASE_URL") || import.meta.env['VITE_SUPABASE_URL'] || "https://vysbmffmlaiqwbnnlhud.supabase.co";
  process.env['SUPABASE_PUBLISHABLE_KEY'] ||=
    pick("SUPABASE_PUBLISHABLE_KEY") ||
    import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    "sb_publishable_w0MuIoV-V2lNaI89wUqiJw_XMcTKfts";
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

const ADS_HOSTS = [
  "https://pagead2.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.google.com",
  "https://*.gstatic.com",
  "https://*.adtrafficquality.google",
  "https://adservice.google.com",
  "https://www.googletagservices.com",
].join(" ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // Google AdSense: script, anúncios em iframe e medição.
    `script-src 'self' 'unsafe-inline' ${ADS_HOSTS}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // Miniaturas do YouTube e criativos dos anúncios vêm de vários domínios do Google.
    "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://i.ytimg.com https:",
    "media-src 'self' https://*.supabase.co",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${ADS_HOSTS}`,
    // Player do YouTube, mapa de trânsito do Waze e anúncios.
    `frame-src https://www.youtube-nocookie.com https://www.youtube.com https://embed.waze.com ${ADS_HOSTS}`,
    "upgrade-insecure-requests",
    "block-all-mixed-content",
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function isTrustedStateChangingRequest(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  if (new URL(request.url).pathname === "/lovable/email/auth/webhook") return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function secureResponse(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if (
    new URL(request.url).pathname.startsWith("/editorial") ||
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    headers.set("Cache-Control", "no-store, max-age=0");
    headers.set("Pragma", "no-cache");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    ensurePublicSupabaseEnv(env);
    if (["TRACE", "CONNECT"].includes(request.method)) {
      return secureResponse(request, new Response("Método não permitido.", { status: 405 }));
    }
    if (!isTrustedStateChangingRequest(request)) {
      return secureResponse(request, new Response("Origem da solicitação não permitida.", { status: 403 }));
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return secureResponse(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return secureResponse(request, new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      }));
    }
  },
};
