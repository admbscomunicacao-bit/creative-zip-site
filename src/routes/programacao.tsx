import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { hourLabel, programs, weekdayName } from "@/data/programs";
import { YOUTUBE_CHANNEL_URL } from "@/lib/youtube";
import { SITE_URL } from "@/lib/brand";

const description =
  "A programação ao vivo do Canal Transforma no YouTube: esporte, educação, gestão pública, cultura, histórias, causa animal e música.";

export const Route = createFileRoute("/programacao")({
  head: () => ({
    meta: [
      { title: "Programação ao vivo | Canal Transforma" },
      { name: "description", content: description },
      { property: "og:title", content: "Programação ao vivo | Canal Transforma" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/programacao` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/programacao` }],
  }),
  component: SchedulePage,
});

// Semana começando na segunda, como no cronograma.
const weekOrder = [1, 2, 3, 4, 5, 6, 0];

function SchedulePage() {
  const days = weekOrder
    .map((day) => ({
      day,
      items: programs.filter((p) => p.weekday === day).sort((a, b) => a.time.localeCompare(b.time)),
    }))
    .filter((d) => d.items.length);

  return (
    <>
      <SiteHeader />
      <section className="listing-shell schedule-page">
        <Link to="/videos" className="back-link">
          ← Vídeos e lives
        </Link>
        <p className="eyebrow">Ao vivo no YouTube</p>
        <h1>Programação</h1>
        <p className="listing-intro">
          Toda semana o Canal Transforma entra ao vivo com conversas sobre o que acontece em
          Catanduva. Horários de Brasília.
        </p>
        <div className="schedule-week">
          {days.map(({ day, items }) => (
            <section key={day} className="schedule-day" aria-labelledby={`dia-${day}`}>
              <h2 id={`dia-${day}`}>{weekdayName[day]}</h2>
              <ul>
                {items.map((p) => (
                  <li key={p.slug} className={`schedule-item section-${p.color}`} id={p.slug}>
                    <time dateTime={p.time}>{hourLabel(p.time)}</time>
                    <div>
                      <h3>{p.name}</h3>
                      <p className="schedule-host">com {p.host}</p>
                      <p>{p.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <a
          className="schedule-cta"
          href={`${YOUTUBE_CHANNEL_URL}?sub_confirmation=1`}
          target="_blank"
          rel="noreferrer"
        >
          Inscreva-se no canal e ative o sininho <b>→</b>
        </a>
      </section>
      <SiteFooter />
    </>
  );
}
