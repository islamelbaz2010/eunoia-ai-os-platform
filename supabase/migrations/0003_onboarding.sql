-- Mandatory organization bootstrap for new (non-invited) users.
-- Regular users cannot INSERT into organizations/organization_members directly
-- (those tables are restricted to super admins / existing org admins), so
-- bootstrap must run through this security definer function.

create or replace function public.create_organization_for_self(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  base_slug text;
  final_slug text;
  suffix int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.organization_members where user_id = auth.uid()) then
    raise exception 'User already belongs to an organization';
  end if;

  if org_name is null or trim(org_name) = '' then
    raise exception 'Organization name is required';
  end if;

  base_slug := trim(both '-' from regexp_replace(lower(trim(org_name)), '[^a-z0-9]+', '-', 'g'));
  if base_slug = '' then
    base_slug := 'workspace';
  end if;
  final_slug := base_slug;

  while exists (select 1 from public.organizations where slug = final_slug) loop
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix;
  end loop;

  insert into public.organizations (name, slug)
  values (trim(org_name), final_slug)
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'owner');

  insert into public.audit_logs (organization_id, actor_id, action, target_type, target_id)
  values (new_org_id, auth.uid(), 'organization.created', 'organization', new_org_id::text);

  return new_org_id;
end;
$$;
