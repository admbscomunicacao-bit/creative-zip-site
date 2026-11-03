-- Revisão editorial (03/11/2026)
-- * Papel "editor": revisa, publica, agenda e corrige matérias de qualquer repórter.
-- * Status "review" (em revisão): o repórter envia; só editor/admin publica.
-- * Agendamento: matéria publicada com published_at no futuro só aparece na hora marcada.
-- * Correção pública, campos de jornalismo (linha fina, legenda, crédito, texto alternativo, tags).
-- * Live: guarda a hora em que entrou no ar (o site desliga a faixa sozinho depois de 6 h).
--
-- Os valores novos dos enums não são usados como literal nesta mesma migração
-- (comparações por ::text), para ela rodar inteira numa transação só.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.article_status ADD VALUE IF NOT EXISTS 'review' BEFORE 'published';

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS subtitle text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_caption text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_credit text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_alt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS correction_note text,
  ADD COLUMN IF NOT EXISTS corrected_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS published_by uuid;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS live_started_at timestamptz;

-- Editor ou administrador aprovado.
CREATE OR REPLACE FUNCTION public.is_editorial_editor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role::text IN ('admin', 'editor')
    )
    AND public.account_status_of(_user_id) = 'approved';
$$;
REVOKE ALL ON FUNCTION public.is_editorial_editor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_editorial_editor(uuid) TO authenticated, service_role;

-- Leitor só vê o que está publicado e cuja hora de publicação já chegou.
DROP POLICY IF EXISTS articles_select_published_public ON public.articles;
CREATE POLICY articles_select_published_public ON public.articles
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

-- Na redação: repórter vê as próprias matérias e as publicadas; editor/admin vê tudo.
DROP POLICY IF EXISTS articles_select_editorial ON public.articles;
CREATE POLICY articles_select_editorial ON public.articles
  FOR SELECT TO authenticated
  USING (
    public.can_use_editorial(auth.uid())
    AND (
      author_id = auth.uid()
      OR status::text = 'published'
      OR public.is_editorial_editor(auth.uid())
    )
  );

-- Repórter cria só rascunho ou envio para revisão; editor/admin pode publicar.
DROP POLICY IF EXISTS articles_insert_editorial ON public.articles;
CREATE POLICY articles_insert_editorial ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_use_editorial(auth.uid())
    AND author_id = auth.uid()
    AND (status::text <> 'published' OR public.is_editorial_editor(auth.uid()))
  );

-- Repórter mexe só nas próprias matérias que ainda não foram publicadas.
DROP POLICY IF EXISTS articles_update_own_or_admin ON public.articles;
CREATE POLICY articles_update_own_or_admin ON public.articles
  FOR UPDATE TO authenticated
  USING (
    public.can_use_editorial(auth.uid())
    AND (
      (author_id = auth.uid() AND status::text <> 'published')
      OR public.is_editorial_editor(auth.uid())
    )
  )
  WITH CHECK (
    public.can_use_editorial(auth.uid())
    AND (
      (author_id = auth.uid() AND status::text <> 'published')
      OR public.is_editorial_editor(auth.uid())
    )
  );

-- Apagar: repórter só o próprio rascunho/envio; matéria publicada só o administrador.
DROP POLICY IF EXISTS articles_delete_own_or_admin ON public.articles;
CREATE POLICY articles_delete_own_or_admin ON public.articles
  FOR DELETE TO authenticated
  USING (
    public.can_use_editorial(auth.uid())
    AND (
      (author_id = auth.uid() AND status::text <> 'published')
      OR public.is_editorial_admin(auth.uid())
    )
  );

-- Regras que a política sozinha não cobre: autoria, quem publicou, revisão e correção.
CREATE OR REPLACE FUNCTION public.articles_editorial_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  is_editor boolean := uid IS NULL OR public.is_editorial_editor(uid);
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Autoria só muda pelo administrador.
    IF NEW.author_id IS DISTINCT FROM OLD.author_id
       AND uid IS NOT NULL AND NOT public.is_editorial_admin(uid) THEN
      NEW.author_id := OLD.author_id;
    END IF;
    -- Observação da revisão, correção e agendamento são do editor.
    IF NOT is_editor THEN
      NEW.review_note := OLD.review_note;
      NEW.reviewed_by := OLD.reviewed_by;
      NEW.correction_note := OLD.correction_note;
      NEW.corrected_at := OLD.corrected_at;
      NEW.published_at := OLD.published_at;
      NEW.published_by := OLD.published_by;
    END IF;
    -- Correção registrada numa matéria já publicada ganha data.
    IF OLD.status::text = 'published'
       AND coalesce(NEW.correction_note, '') <> ''
       AND NEW.correction_note IS DISTINCT FROM OLD.correction_note THEN
      NEW.corrected_at := now();
    END IF;
  ELSE
    IF NOT is_editor THEN
      NEW.review_note := NULL;
      NEW.reviewed_by := NULL;
      NEW.correction_note := NULL;
      NEW.corrected_at := NULL;
      NEW.published_at := NULL;
      NEW.published_by := NULL;
    END IF;
  END IF;

  IF NEW.status::text = 'review'
     AND (TG_OP = 'INSERT' OR OLD.status::text IS DISTINCT FROM 'review') THEN
    NEW.submitted_at := now();
  END IF;

  IF NEW.status::text = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status::text IS DISTINCT FROM 'published') THEN
    NEW.published_by := uid;
    NEW.reviewed_by := uid;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.articles_editorial_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS articles_editorial_guard ON public.articles;
CREATE TRIGGER articles_editorial_guard
BEFORE INSERT OR UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.articles_editorial_guard();

-- Live: marca quando entrou no ar.
CREATE OR REPLACE FUNCTION public.protect_site_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.youtube_channel_id IS DISTINCT FROM OLD.youtube_channel_id
      OR NEW.adsense_client IS DISTINCT FROM OLD.adsense_client
      OR NEW.adsense_enabled IS DISTINCT FROM OLD.adsense_enabled)
     AND auth.uid() IS NOT NULL
     AND NOT public.is_editorial_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores alteram o canal do YouTube e o AdSense.';
  END IF;
  -- Recomeça a contagem quando liga, quando troca o link ou quando a anterior já expirou (6 h).
  IF NEW.live_active AND (
       NOT coalesce(OLD.live_active, false)
       OR NEW.live_url IS DISTINCT FROM OLD.live_url
       OR OLD.live_started_at IS NULL
       OR OLD.live_started_at < now() - interval '6 hours'
     ) THEN
    NEW.live_started_at := now();
  ELSIF NOT NEW.live_active THEN
    NEW.live_started_at := NULL;
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_site_settings() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS articles_status_updated_idx ON public.articles (status, updated_at DESC);
