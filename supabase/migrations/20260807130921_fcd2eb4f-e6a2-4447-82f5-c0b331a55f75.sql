CREATE OR REPLACE FUNCTION public.is_mfa_session()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'aal', '') = 'aal2'
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'amr', '[]'::jsonb)) = 'array'
            THEN current_setting('request.jwt.claims', true)::jsonb -> 'amr'
          ELSE '[]'::jsonb
        END
      ) AS e
      WHERE e ->> 'method' IN ('otp', 'magiclink', 'email', 'email_otp', 'totp', 'mfa/totp')
    );
$function$;