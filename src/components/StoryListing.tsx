import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ListingCard } from "@/components/StoryCard";
import type { Story } from "@/data/stories";
import { listPublishedStories } from "@/lib/public-articles.functions";

type Filter = { section?: "Cidade" | "Política" | "Serviços" | "Esportes"; q?: string };

/** Grade de matérias com botão "Carregar mais" (busca as próximas no servidor). */
export function StoryListing({
  initial,
  hasMore: initialHasMore,
  filter,
  pageSize,
}: {
  initial: Story[];
  hasMore: boolean;
  filter: Filter;
  pageSize: number;
}) {
  const fetchMore = useServerFn(listPublishedStories);
  const [stories, setStories] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  return (
    <>
      <div className="listing-grid">
        {stories.map((s) => (
          <ListingCard key={s.slug} story={s} />
        ))}
      </div>
      {hasMore ? (
        <div className="listing-more">
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError(false);
              try {
                const next = await fetchMore({
                  data: { ...filter, limit: pageSize, offset: stories.length },
                });
                setStories((prev) => [...prev, ...next.stories]);
                setHasMore(next.hasMore);
              } catch {
                setError(true);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Carregando..." : "Carregar mais matérias"}
          </button>
          {error ? <p role="alert">Não foi possível carregar. Tente de novo.</p> : null}
        </div>
      ) : null}
    </>
  );
}
