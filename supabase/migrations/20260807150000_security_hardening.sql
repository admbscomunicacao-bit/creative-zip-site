-- Require the second verification step at the data layer, not only in the UI.
-- Password-only sessions cannot read or change editorial data.
CREATE OR REPLACE FUNCTION public.can_use_editorial(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.account_status_of(_user_id) = 'approved'
     AND public.is_mfa_session();
$$;

REVOKE ALL ON FUNCTION public.can_use_editorial(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_editorial(uuid) TO authenticated, service_role;

-- An editorial user may upload only inside their own folder, with an approved
-- extension. This prevents one account from overwriting another user's files.
DROP POLICY IF EXISTS "article media editorial read" ON storage.objects;
DROP POLICY IF EXISTS "article media editorial insert" ON storage.objects;
DROP POLICY IF EXISTS "article media editorial delete" ON storage.objects;

CREATE POLICY "article media editorial read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'article-media' AND public.can_use_editorial(auth.uid()));

CREATE POLICY "article media editorial insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'article-media'
    AND public.can_use_editorial(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm')
  );

CREATE POLICY "article media editorial delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'article-media'
    AND public.can_use_editorial(auth.uid())
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_editorial_admin(auth.uid())
    )
  );
