-- Server-side verified paths (service role, auth.uid() IS NULL) must be able to change status;
-- those callers verify approved-admin + MFA before writing.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IS DISTINCT FROM OLD.status
     AND auth.uid() IS NOT NULL
     AND NOT (public.is_editorial_admin(auth.uid()) AND public.is_mfa_session()) THEN
    RAISE EXCEPTION 'Somente administradores aprovados com MFA podem alterar o status da conta';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM PUBLIC, anon, authenticated;