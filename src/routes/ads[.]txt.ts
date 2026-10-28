import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { readSiteSettings } from "@/lib/site.functions";

/** ads.txt exigido pelo AdSense, gerado a partir do ID salvo no painel. */
export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: async () => {
        const { adsenseClient } = await readSiteSettings();
        const body = adsenseClient
          ? `google.com, ${adsenseClient.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`
          : "# AdSense ainda não configurado no painel da redação.\n";
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
