CREATE TYPE public.article_status AS ENUM ('draft','published');

CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  section text NOT NULL DEFAULT 'Cidade',
  color text NOT NULL DEFAULT 'blue',
  status public.article_status NOT NULL DEFAULT 'draft',
  body_html text NOT NULL DEFAULT '',
  cover_url text,
  author_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY articles_select_published_public ON public.articles
  FOR SELECT TO anon, authenticated USING (status = 'published');

CREATE POLICY articles_select_editorial ON public.articles
  FOR SELECT TO authenticated USING (public.can_use_editorial(auth.uid()));

CREATE POLICY articles_insert_editorial ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (public.can_use_editorial(auth.uid()) AND author_id = auth.uid());

CREATE POLICY articles_update_own_or_admin ON public.articles
  FOR UPDATE TO authenticated
  USING (public.can_use_editorial(auth.uid()) AND (author_id = auth.uid() OR public.is_editorial_admin(auth.uid())))
  WITH CHECK (public.can_use_editorial(auth.uid()) AND (author_id = auth.uid() OR public.is_editorial_admin(auth.uid())));

CREATE POLICY articles_delete_own_or_admin ON public.articles
  FOR DELETE TO authenticated
  USING (public.can_use_editorial(auth.uid()) AND (author_id = auth.uid() OR public.is_editorial_admin(auth.uid())));

CREATE OR REPLACE FUNCTION public.articles_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER articles_touch_updated_at BEFORE INSERT OR UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.articles_touch_updated_at();

CREATE INDEX articles_status_idx ON public.articles (status, published_at DESC);

CREATE POLICY "article media editorial read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'article-media' AND public.can_use_editorial(auth.uid()));

CREATE POLICY "article media editorial insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'article-media' AND public.can_use_editorial(auth.uid()));

CREATE POLICY "article media editorial delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'article-media' AND public.can_use_editorial(auth.uid()));