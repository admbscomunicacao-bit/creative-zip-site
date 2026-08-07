CREATE OR REPLACE FUNCTION public.can_use_editorial(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.account_status_of(_user_id) = 'approved'; $$;

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IS DISTINCT FROM OLD.status
     AND auth.uid() IS NOT NULL
     AND NOT public.is_editorial_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Somente administradores aprovados podem alterar o status da conta';
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin ON public.profiles FOR SELECT TO authenticated
  USING (public.is_editorial_admin(auth.uid()));

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_editorial_admin(auth.uid()))
  WITH CHECK (public.is_editorial_admin(auth.uid()));

DROP POLICY IF EXISTS user_roles_select_admin ON public.user_roles;
CREATE POLICY user_roles_select_admin ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_editorial_admin(auth.uid()));

DROP POLICY IF EXISTS audit_select_admin ON public.audit_log;
CREATE POLICY audit_select_admin ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_editorial_admin(auth.uid()));