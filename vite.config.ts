// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public (non-secret) backend settings. Fallback so published builds always
// embed them even if the build environment does not provide the .env file.
const PUBLIC_SUPABASE_URL = "https://vysbmffmlaiqwbnnlhud.supabase.co";
const PUBLIC_SUPABASE_KEY = "sb_publishable_w0MuIoV-V2lNaI89wUqiJw_XMcTKfts";
process.env.VITE_SUPABASE_URL ||= PUBLIC_SUPABASE_URL;
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= PUBLIC_SUPABASE_KEY;
process.env.VITE_SUPABASE_PROJECT_ID ||= "vysbmffmlaiqwbnnlhud";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
