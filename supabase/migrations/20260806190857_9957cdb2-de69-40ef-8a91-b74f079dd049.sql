-- Enums
CREATE TYPE public.app_role AS ENUM ('reporter', 'admin');
CREATE TYPE public.account_status AS ENUM ('pending', 'approved', 'blocked');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  bio text,
  status public.account_status NOT NULL DEFAULT 'pending',
  terms_accepted_at timestamptz,
  mfa_enrolled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Audit log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  target_user_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.account_status_of(_user_id uuid)
RETURNS public.account_status LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT status FROM public.profiles WHERE id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_mfa_session()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'aal', '') = 'aal2';
$$;

CREATE OR REPLACE FUNCTION public.is_editorial_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
     AND public.account_status_of(_user_id) = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.can_use_editorial(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.account_status_of(_user_id) = 'approved' AND public.is_mfa_session();
$$;

-- Keep status/role escalation out of self-service profile updates
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (public.is_editorial_admin(auth.uid()) AND public.is_mfa_session()) THEN
    RAISE EXCEPTION 'Somente administradores aprovados com MFA podem alterar o status da conta';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_privileges
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

CREATE OR REPLACE FUNCTION public.force_pending_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.status = 'pending';
  RETURN NEW;
END;
$$;

CREATE TRIGGER force_pending_on_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.force_pending_on_insert();

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles
FOR SELECT TO authenticated USING (public.is_editorial_admin(auth.uid()) AND public.is_mfa_session());

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_editorial_admin(auth.uid()) AND public.is_mfa_session())
WITH CHECK (public.is_editorial_admin(auth.uid()) AND public.is_mfa_session());

-- Roles policies (writes only via service role / server code)
CREATE POLICY "user_roles_select_own" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_roles_select_admin" ON public.user_roles
FOR SELECT TO authenticated USING (public.is_editorial_admin(auth.uid()) AND public.is_mfa_session());

-- Audit policies
CREATE POLICY "audit_select_admin" ON public.audit_log
FOR SELECT TO authenticated USING (public.is_editorial_admin(auth.uid()) AND public.is_mfa_session());

CREATE INDEX idx_profiles_status ON public.profiles (status);
CREATE INDEX idx_audit_created_at ON public.audit_log (created_at DESC);