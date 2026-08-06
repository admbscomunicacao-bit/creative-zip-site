CREATE OR REPLACE FUNCTION public.is_mfa_session()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'aal', '') = 'aal2';
$$;

REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.force_pending_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.account_status_of(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_editorial_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_use_editorial(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_mfa_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.account_status_of(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_editorial_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_use_editorial(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_mfa_session() TO authenticated, service_role;