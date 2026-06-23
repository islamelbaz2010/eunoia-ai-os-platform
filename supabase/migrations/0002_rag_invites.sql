-- Eunoia AI OS - RAG retrieval + organization invites

-- Vector similarity index (cosine distance) ---------------------------------------

create index knowledge_base_chunks_embedding_idx
  on public.knowledge_base_chunks
  using hnsw (embedding vector_cosine_ops);

-- Vector similarity search RPC ------------------------------------------------------

create or replace function public.match_kb_chunks(
  query_embedding vector(1536),
  target_org_id uuid,
  match_count int default 6
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.knowledge_base_chunks c
  where c.organization_id = target_org_id
    and (public.is_org_member(target_org_id) or public.is_super_admin())
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Organization invites ----------------------------------------------------------------

create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.org_role not null default 'member',
  token uuid not null default gen_random_uuid(),
  status public.invite_status not null default 'pending',
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  unique (organization_id, email, status)
);

create index organization_invites_org_id_idx on public.organization_invites (organization_id);
create index organization_invites_token_idx on public.organization_invites (token);

alter table public.organization_invites enable row level security;

create policy "admins manage invites" on public.organization_invites
  for all using (
    public.org_role(organization_id) in ('owner', 'admin') or public.is_super_admin()
  );

-- Allow an invited user to read their own pending invite by email match, for accept flow.
create policy "invitee can view own invite" on public.organization_invites
  for select using (
    email = (select email from auth.users where id = auth.uid())
  );

-- Accept invite: security definer so the invitee (who has no insert grant on
-- organization_members) can join once, scoped to their own matching invite only.

create or replace function public.accept_org_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.organization_invites;
  current_email text;
  new_org_id uuid;
begin
  select email into current_email from auth.users where id = auth.uid();

  select * into invite
  from public.organization_invites
  where token = invite_token
    and status = 'pending'
    and expires_at > now()
  limit 1;

  if invite is null or invite.email is distinct from current_email then
    raise exception 'Invalid or expired invite';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (invite.organization_id, auth.uid(), invite.role)
  on conflict (organization_id, user_id) do update set role = excluded.role;

  update public.organization_invites
  set status = 'accepted'
  where id = invite.id;

  new_org_id := invite.organization_id;
  return new_org_id;
end;
$$;
