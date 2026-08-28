-- Org members may read display names of peers in the same organization.
-- Used so review UI never shows raw profile UUIDs to operators.

CREATE OR REPLACE FUNCTION public.org_member_directory(target uuid)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  email text,
  role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, m.role::text
  FROM public.organization_memberships m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.organization_id = target
    AND m.status = 'active'
    AND public.is_org_member(target)
$$;

REVOKE ALL ON FUNCTION public.org_member_directory(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_member_directory(uuid) TO authenticated;

DROP POLICY IF EXISTS profiles_org_peer_select ON public.profiles;
CREATE POLICY profiles_org_peer_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.organization_memberships mine
      JOIN public.organization_memberships peer
        ON peer.organization_id = mine.organization_id
       AND peer.status = 'active'
      WHERE mine.user_id = public.current_profile_id()
        AND mine.status = 'active'
        AND peer.user_id = profiles.id
    )
  );
