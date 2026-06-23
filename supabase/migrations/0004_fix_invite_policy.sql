-- Fix: "invitee can view own invite" referenced auth.users directly, which the
-- authenticated role has no SELECT grant on in real Supabase. Use the email
-- claim already present on the JWT instead, which requires no table access.

drop policy if exists "invitee can view own invite" on public.organization_invites;

create policy "invitee can view own invite" on public.organization_invites
  for select using (email = (auth.jwt() ->> 'email'));
