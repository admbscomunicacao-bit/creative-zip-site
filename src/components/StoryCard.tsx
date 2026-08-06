import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { Story } from "@/data/stories";

export function StoryCard({ story, small = false }: { story: Story; small?: boolean }) {
  return (
    <Link
      to="/noticia/$slug"
      params={{ slug: story.slug }}
      className={`card ${small ? "small" : ""}`}
    >
      <div className="image-wrap">
        <img className="cover" src={story.image} alt="" loading="lazy" />
      </div>
      <div>
        <span className={`tag ${story.color}`}>{story.section}</span>
        <h3>{story.title}</h3>
        {!small && <p>{story.summary}</p>}
        <time>{story.date}</time>
        <span className="more">
          {small ? "" : "Abrir matéria "}
          <ArrowRight size={17} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="section-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </section>
  );
}
