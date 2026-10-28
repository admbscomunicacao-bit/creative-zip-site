-- Login em duas etapas de verdade: senha + código do e-mail na MESMA sessão.
--
-- Antes, a sessão do painel nascia só do código do e-mail (a senha era conferida
-- apenas na tela), então quem tivesse acesso ao e-mail entrava sem a senha.
-- Agora a sessão nasce da senha, o servidor confere o código e marca aquela
-- sessão como verificada; o banco só libera a redação com as duas coisas.

CREATE TABLE IF NOT EXISTS public.editorial_verified_sessions (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS editorial_verified_sessions_user_idx
  ON public.editorial_verified_sessions (user_id);

-- Só o servidor (service_role) grava aqui; usuários não leem nem alteram.
ALTER TABLE public.editorial_verified_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.editorial_verified_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.editorial_verified_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.is_mfa_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb AS claims
  )
  SELECT
    -- 1. A sessão foi aberta com a senha (login só por código ou link não serve).
    EXISTS (
      SELECT 1
      FROM c,
        jsonb_array_elements(
          CASE WHEN jsonb_typeof(c.claims -> 'amr') = 'array' THEN c.claims -> 'amr' ELSE '[]'::jsonb END
        ) AS e
      WHERE e ->> 'method' = 'password'
    )
    -- 2. O código do e-mail foi confirmado para esta mesma sessão e ainda vale.
    AND EXISTS (
      SELECT 1
      FROM c, public.editorial_verified_sessions v
      WHERE v.session_id::text = c.claims ->> 'session_id'
        AND v.user_id = auth.uid()
        AND v.expires_at > now()
    );
$$;

REVOKE ALL ON FUNCTION public.is_mfa_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mfa_session() TO authenticated, service_role;
