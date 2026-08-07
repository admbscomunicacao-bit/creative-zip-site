import { Link } from "@tanstack/react-router";
import type { Story } from "@/data/stories";

/** Reduz o peso das capas pedindo uma versão menor ao CDN de imagens. */
function sized(url: string, width: number) {
  if (!url.includes("images.unsplash.com")) return url;
  return url.replace(/([?&])w=\d+/, `$1w=${width}`);
}

function StoryLink({ story, children }: { story: Story; children: React.ReactNode }) {
  return (
    <Link
      to="/noticia/$slug"
      params={{ slug: story.slug }}
      className="story-card-link"
      aria-label={`Ler: ${story.title}`}
    >
      {children}
    </Link>
  );
}

export function LeadStory({ story }: { story: Story }) {
  return (
    <StoryLink story={story}>
      <article className="lead-story">
        <div className={`story-art section-${story.color}`}>
          <img
            src={sized(story.image, 900)}
            width={900}
            height={506}
            alt={`Capa: ${story.title}`}
            loading="lazy"
            decoding="async"
          />
        </div>
        <p className={`story-section section-${story.color}`}>{story.section}</p>
        <h2>{story.title}</h2>
        <p>{story.summary}</p>
        <span className="story-action">
          Ler reportagem sobre {story.section.toLowerCase()} <b>→</b>
        </span>
      </article>
    </StoryLink>
  );
}

export function MiniStory({ story }: { story: Story }) {
  return (
    <StoryLink story={story}>
      <article className="mini-story">
        <div className={`mini-art section-${story.color}`}>
          <img
            src={sized(story.image, 480)}
            alt={`Capa: ${story.title}`}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div>
          <p className={`story-section section-${story.color}`}>{story.section}</p>
          <h3>{story.title}</h3>
          <time>{story.date}</time>
          <span className="story-action">→</span>
        </div>
      </article>
    </StoryLink>
  );
}

export function NewsCard({ story }: { story: Story }) {
  return (
    <StoryLink story={story}>
      <article className="news-card">
        <div className={`news-visual section-${story.color}`}>
          <img
            src={sized(story.image, 480)}
            alt={`Capa: ${story.title}`}
            loading="lazy"
            decoding="async"
          />
        </div>
        <span className={`category-tag section-${story.color}`}>{story.section}</span>
        <h3>{story.title}</h3>
        <time>{story.date}</time>
        <span className="story-action">
          Abrir matéria <b>→</b>
        </span>
      </article>
    </StoryLink>
  );
}

export function ListingCard({ story }: { story: Story }) {
  return (
    <StoryLink story={story}>
      <article className="listing-card">
        <div className={`listing-art ${story.color}`}>
          <img
            src={sized(story.image, 480)}
            alt={`Capa: ${story.title}`}
            loading="lazy"
            decoding="async"
          />
        </div>
        <p className={`story-section section-${story.color}`}>{story.section}</p>
        <h2>{story.title}</h2>
        <p>{story.summary}</p>
        <time>{story.date}</time>
        <span className="story-action">
          Ler reportagem <b>→</b>
        </span>
      </article>
    </StoryLink>
  );
}
