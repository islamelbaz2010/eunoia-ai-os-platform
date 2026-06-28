-- Eunoia AI OS — Hardening v2
-- Race condition fix, data integrity, and performance indexes.

-- 1. Index for last-owner queries (organization_id, role) ----------------------
-- updateMemberRole and removeMember both query WHERE organization_id = X AND role = 'owner'.
-- Without this index, those checks are sequential scans on large orgs.

CREATE INDEX IF NOT EXISTS org_members_org_role_idx
  ON public.organization_members (organization_id, role);

-- 2. NOT NULL on embedding column ----------------------------------------------
-- A chunk row with a NULL embedding is corrupt — it will never appear in
-- vector search results but wastes space and causes confusion.
-- The USING clause handles any pre-existing NULL rows by deleting them first.

DELETE FROM public.knowledge_base_chunks WHERE embedding IS NULL;

ALTER TABLE public.knowledge_base_chunks
  ALTER COLUMN embedding SET NOT NULL;

-- 3. Fix accept_org_invite race condition ---------------------------------------
-- Two concurrent calls with the same token both read status='pending' before
-- either write. Adding FOR UPDATE locks the row so only one can proceed.

CREATE OR REPLACE FUNCTION public.accept_org_invite(invite_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite public.organization_invites;
  current_email text;
  new_org_id uuid;
BEGIN
  SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();

  -- Lock the row so concurrent calls with the same token serialize here.
  SELECT * INTO invite
  FROM public.organization_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1
  FOR UPDATE;

  IF invite IS NULL OR invite.email IS DISTINCT FROM current_email THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (invite.organization_id, auth.uid(), invite.role)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = excluded.role;

  UPDATE public.organization_invites
  SET status = 'accepted'
  WHERE id = invite.id;

  new_org_id := invite.organization_id;
  RETURN new_org_id;
END;
$$;
