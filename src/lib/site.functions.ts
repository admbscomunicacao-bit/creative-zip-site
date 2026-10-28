import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { youtubeVideoId } from "@/lib/youtube";

/* ── Configurações do portal (faixa AO VIVO, YouTube e AdSense) ── */

export type SiteSettings = {
  liveActive: boolean;
  liveUrl: string | null;
  liveTitle: string;
  youtubeChannelId: string;
  adsenseClient: string | null;
  adsenseEnabled: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  liveActive: false,
  liveUrl: null,
  liveTitle: "",
  youtubeChannelId: "UC0-Yl4Ibkys2cKjuF6uJrmg",
  adsenseClient: null,
  adsenseEnabled: false,
};

type SettingsRow = {
  live_active: boolean;
  live_url: string | null;
  live_title: string;
  youtube_channel_id: string;
  adsense_client: string | null;
  adsense_enabled: boolean;
};

const SETTINGS_SELECT =
  "live_active,live_url,live_title,youtube_channel_id,adsense_client,adsense_enabled";

const toSettings = (row: SettingsRow): SiteSettings => ({
  liveActive: row.live_active,
  liveUrl: row.live_url,
  liveTitle: row.live_title ?? "",
  youtubeChannelId: row.youtube_channel_id || DEFAULT_SETTINGS.youtubeChannelId,
  adsenseClient: row.adsense_client,
  adsenseEnabled: row.adsense_enabled,
});

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Lê as configurações com cache curto: a faixa AO VIVO aparece em até 20 segundos. */
let settingsCache: { at: number; value: SiteSettings } | null = null;

export async function readSiteSettings(): Promise<SiteSettings> {
  if (settingsCache && Date.now() - settingsCache.at < 20_000) return settingsCache.value;
  let value = DEFAULT_SETTINGS;
  try {
    const { data } = (await publicClient()
      ?.from("site_settings")
      .select(SETTINGS_SELECT)
      .eq("id", 1)
      .maybeSingle()) ?? { data: null };
    if (data) value = toSettings(data as SettingsRow);
  } catch {
    // Banco fora do ar ou migração ainda não aplicada: o portal segue com o padrão.
  }
  settingsCache = { at: Date.now(), value };
  return value;
}

export const getSiteSettings = createServerFn({ method: "GET" }).handler(() => readSiteSettings());

const settingsInput = z.object({
  liveActive: z.boolean(),
  liveUrl: z.string().trim().max(500).nullable(),
  liveTitle: z.string().trim().max(140),
  youtubeChannelId: z
    .string()
    .trim()
    .regex(/^UC[A-Za-z0-9_-]{22}$/, "O ID do canal começa com UC e tem 24 caracteres."),
  adsenseClient: z
    .string()
    .trim()
    .regex(/^ca-pub-\d{10,20}$/, "O ID do AdSense tem o formato ca-pub-0000000000000000.")
    .nullable(),
  adsenseEnabled: z.boolean(),
});

export type SiteSettingsInput = z.infer<typeof settingsInput>;

export const updateSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SiteSettingsInput) => settingsInput.parse(input))
  .handler(async ({ data, context }) => {
    if (
      data.liveActive &&
      !youtubeVideoId(data.liveUrl) &&
      !data.liveUrl?.includes("youtube.com")
    ) {
      throw new Error("Cole o link da live do YouTube antes de ligar a faixa AO VIVO.");
    }
    if (data.adsenseEnabled && !data.adsenseClient) {
      throw new Error("Informe o ID do AdSense antes de ativar os anúncios.");
    }
    const { data: row, error } = await context.supabase
      .from("site_settings")
      .update({
        live_active: data.liveActive,
        live_url: data.liveUrl || null,
        live_title: data.liveTitle,
        youtube_channel_id: data.youtubeChannelId,
        adsense_client: data.adsenseClient || null,
        adsense_enabled: data.adsenseEnabled,
      })
      .eq("id", 1)
      .select(SETTINGS_SELECT)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Sem permissão para alterar as configurações do portal.");
    settingsCache = null;
    return toSettings(row as SettingsRow);
  });

/* ── Vídeos do canal (feed público do YouTube, sem chave de API) ── */

export type ChannelVideo = {
  id: string;
  title: string;
  publishedAt: string;
};

const decode = (text: string) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

let videosCache: { at: number; channel: string; value: ChannelVideo[] } | null = null;

export const getChannelVideos = createServerFn({ method: "GET" }).handler(async () => {
  const { youtubeChannelId } = await readSiteSettings();
  if (
    videosCache &&
    videosCache.channel === youtubeChannelId &&
    Date.now() - videosCache.at < 15 * 60_000
  ) {
    return videosCache.value;
  }
  let value: ChannelVideo[] = [];
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelId}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (res.ok) {
      const xml = await res.text();
      value = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
        .map(([, entry]) => ({
          id: /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(entry!)?.[1] ?? "",
          title: decode(/<title>([^<]*)<\/title>/.exec(entry!)?.[1] ?? ""),
          publishedAt: /<published>([^<]+)<\/published>/.exec(entry!)?.[1] ?? "",
        }))
        .filter((v) => v.id)
        .slice(0, 8);
    }
  } catch {
    // YouTube indisponível: a seção mostra o convite para o canal.
  }
  videosCache = { at: Date.now(), channel: youtubeChannelId, value };
  return value;
});

/* ── Clima de Catanduva (Open-Meteo, sem chave de API) ── */

export type Weather = {
  temperature: number;
  max: number;
  min: number;
  label: string;
  kind: "sun" | "cloud" | "rain" | "storm" | "fog" | "night";
};

function describe(code: number, isDay: boolean): Pick<Weather, "label" | "kind"> {
  if (code === 0)
    return { label: isDay ? "Céu limpo" : "Noite limpa", kind: isDay ? "sun" : "night" };
  if (code <= 2) return { label: "Poucas nuvens", kind: isDay ? "sun" : "night" };
  if (code === 3) return { label: "Nublado", kind: "cloud" };
  if (code === 45 || code === 48) return { label: "Neblina", kind: "fog" };
  if (code >= 95) return { label: "Tempestade", kind: "storm" };
  if (code >= 51) return { label: "Chuva", kind: "rain" };
  return { label: "Nublado", kind: "cloud" };
}

let weatherCache: { at: number; value: Weather | null } | null = null;

export const getWeather = createServerFn({ method: "GET" }).handler(async () => {
  if (weatherCache && Date.now() - weatherCache.at < 15 * 60_000) return weatherCache.value;
  let value: Weather | null = null;
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-21.1378&longitude=-48.9729" +
        "&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min" +
        "&forecast_days=1&timezone=America%2FSao_Paulo",
      { signal: AbortSignal.timeout(4000) },
    );
    if (res.ok) {
      const json = (await res.json()) as {
        current: { temperature_2m: number; weather_code: number; is_day: number };
        daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
      };
      value = {
        temperature: Math.round(json.current.temperature_2m),
        max: Math.round(json.daily.temperature_2m_max[0] ?? json.current.temperature_2m),
        min: Math.round(json.daily.temperature_2m_min[0] ?? json.current.temperature_2m),
        ...describe(json.current.weather_code, json.current.is_day === 1),
      };
    }
  } catch {
    // Sem clima: o cabeçalho mostra só data e hora.
  }
  weatherCache = { at: Date.now(), value };
  return value;
});
