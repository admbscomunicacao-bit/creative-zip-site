-- Contagem de leituras por matéria (Mais lidas da semana). 03/11/2026

-- Leituras por matéria e por dia (sem dado pessoal: só o total).
CREATE TABLE IF NOT EXISTS public.article_views (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  views integer NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, day)
);
ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.article_views TO service_role;
-- Equipe aprovada pode ver os números no painel.
GRANT SELECT ON public.article_views TO authenticated;
CREATE POLICY article_views_select_editorial ON public.article_views
  FOR SELECT TO authenticated USING (public.can_use_editorial(auth.uid()));

-- Soma uma leitura numa matéria publicada (chamada só pelo servidor do site).
CREATE OR REPLACE FUNCTION public.count_article_view(_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid;
BEGIN
  SELECT id INTO target FROM public.articles
  WHERE slug = _slug AND status = 'published' AND (published_at IS NULL OR published_at <= now());
  IF target IS NULL THEN RETURN; END IF;
  INSERT INTO public.article_views (article_id, day, views)
  VALUES (target, (now() AT TIME ZONE 'America/Sao_Paulo')::date, 1)
  ON CONFLICT (article_id, day) DO UPDATE SET views = public.article_views.views + 1;
END;
$$;
REVOKE ALL ON FUNCTION public.count_article_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_article_view(text) TO service_role;

-- Mais lidas dos últimos dias (só matérias publicadas).
CREATE OR REPLACE FUNCTION public.most_read_articles(_days integer DEFAULT 7, _limit integer DEFAULT 5)
RETURNS TABLE (slug text, views bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.slug, sum(v.views)::bigint AS views
  FROM public.article_views v
  JOIN public.articles a ON a.id = v.article_id
  WHERE v.day >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - greatest(_days, 1))
    AND a.status = 'published'
    AND (a.published_at IS NULL OR a.published_at <= now())
  GROUP BY a.slug
  ORDER BY views DESC
  LIMIT least(greatest(_limit, 1), 20);
$$;
REVOKE ALL ON FUNCTION public.most_read_articles(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.most_read_articles(integer, integer) TO anon, authenticated, service_role;
