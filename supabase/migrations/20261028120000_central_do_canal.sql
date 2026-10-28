-- Central do Canal: vídeo do YouTube na reportagem e configurações do portal
-- (faixa AO VIVO, canal do YouTube e Google AdSense) editadas pelo painel da redação.

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS video_url text;

CREATE TABLE IF NOT EXISTS public.site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  live_active boolean NOT NULL DEFAULT false,
  live_url text,
  live_title text NOT NULL DEFAULT '',
  youtube_channel_id text NOT NULL DEFAULT 'UC0-Yl4Ibkys2cKjuF6uJrmg',
  adsense_client text,
  adsense_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_settings_select_public ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

-- Qualquer pessoa aprovada da redação liga e desliga a live.
CREATE POLICY site_settings_update_editorial ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.can_use_editorial(auth.uid()))
  WITH CHECK (public.can_use_editorial(auth.uid()));

-- Canal do YouTube e AdSense só mudam por administrador.
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
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_site_settings() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_site_settings ON public.site_settings;
CREATE TRIGGER protect_site_settings
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.protect_site_settings();
