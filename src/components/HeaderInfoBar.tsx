import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Car, Cloud, CloudFog, CloudLightning, CloudRain, Moon, Sun, X } from "lucide-react";
import { SocialRow } from "@/components/social";
import { getWeather, type Weather } from "@/lib/site.functions";

const CATANDUVA = { lat: -21.1378, lon: -48.9729 };
const WAZE_EMBED = `https://embed.waze.com/iframe?zoom=13&lat=${CATANDUVA.lat}&lon=${CATANDUVA.lon}&ct=livemap`;
const WAZE_APP = `https://www.waze.com/live-map/directions?to=ll.${CATANDUVA.lat}%2C${CATANDUVA.lon}`;

const weatherIcon: Record<Weather["kind"], typeof Sun> = {
  sun: Sun,
  night: Moon,
  cloud: Cloud,
  rain: CloudRain,
  storm: CloudLightning,
  fog: CloudFog,
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});
const shortDateFormat = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "America/Sao_Paulo",
});
const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Relógio só no navegador: evita diferença entre o HTML do servidor e o da pessoa. */
function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function HeaderInfoBar() {
  const now = useNow();
  const fetchWeather = useServerFn(getWeather);
  const { data: weather } = useQuery({
    queryKey: ["weather"],
    queryFn: () => fetchWeather(),
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
  });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [trafficOpen, setTrafficOpen] = useState(false);

  const openTraffic = () => {
    setTrafficOpen(true);
    dialogRef.current?.showModal();
  };

  const Icon = weather ? weatherIcon[weather.kind] : null;
  const date = now ? dateFormat.format(now) : "";
  const shortDate = now ? shortDateFormat.format(now) : "";

  return (
    <div className="infobar">
      <div className="infobar-inner">
        <p className="infobar-date" aria-live="off">
          {now ? (
            <>
              <span className="infobar-day">{date.charAt(0).toUpperCase() + date.slice(1)}</span>
              <span className="infobar-day-short">
                {shortDate.charAt(0).toUpperCase() + shortDate.slice(1).replace(/\./g, "")}
              </span>
              <time dateTime={now.toISOString()}>{timeFormat.format(now)}</time>
            </>
          ) : (
            <span className="infobar-day">Catanduva, SP</span>
          )}
        </p>
        <div className="infobar-tools">
          {weather && Icon ? (
            <span
              className="infobar-weather"
              title={`${weather.label}. Mínima de ${weather.min}°, máxima de ${weather.max}°.`}
            >
              <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
              <b>{weather.temperature}°</b>
              <span className="infobar-weather-label">
                {weather.label} · {weather.min}° / {weather.max}°
              </span>
              <span className="sr-only">em Catanduva</span>
            </span>
          ) : null}
          <button type="button" className="infobar-traffic" onClick={openTraffic}>
            <Car size={16} strokeWidth={2.2} aria-hidden="true" />
            Trânsito
          </button>
          <SocialRow className="infobar-social" size={15} />
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="traffic-dialog"
        aria-labelledby="traffic-title"
        onClose={() => setTrafficOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="traffic-head">
          <div>
            <p className="eyebrow">Ao vivo pelo Waze</p>
            <h2 id="traffic-title">Trânsito em Catanduva agora</h2>
          </div>
          <button type="button" aria-label="Fechar mapa" onClick={() => dialogRef.current?.close()}>
            <X size={20} />
          </button>
        </div>
        <div className="traffic-map">
          {trafficOpen ? (
            <iframe
              src={WAZE_EMBED}
              title="Mapa de trânsito de Catanduva"
              loading="lazy"
              allowFullScreen
            />
          ) : null}
        </div>
        <a className="traffic-app" href={WAZE_APP} target="_blank" rel="noreferrer">
          Abrir no Waze <b>→</b>
        </a>
      </dialog>
    </div>
  );
}
