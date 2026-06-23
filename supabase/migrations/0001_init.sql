-- Eunoia AI OS - Phase 1 schema
-- Organizations, RBAC, CRM, Knowledge Base, Audit Logs, Usage Tracking

create extension if not exists "pgcrypto";

create type public.org_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.kb_status as enum ('draft', 'published', 'archived');
create type public.crm_lead_status as enum ('new', 'contacted', 'qualified', 'won', 'lost');

-- Organizations -------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_super_admin_org boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles (1:1 with auth.users) ---------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organization membership (RBAC) ---------------------------------------------

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);
create index organization_members_org_id_idx on public.organization_members (organization_id);

-- CRM -------------------------------------------------------------------------

create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  company text,
  notes text,
  status public.crm_lead_status not null default 'new',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_contacts_org_id_idx on public.crm_contacts (organization_id);

-- Knowledge Base ---------------------------------------------------------------

create table public.knowledge_base_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  content text,
  status public.kb_status not null default 'draft',
  language text not null default 'en',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index kb_documents_org_id_idx on public.knowledge_base_documents (organization_id);

-- RAG: document chunks + embeddings (pgvector) ---------------------------------

create extension if not exists "vector";

create table public.knowledge_base_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_base_documents (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index kb_chunks_org_id_idx on public.knowledge_base_chunks (organization_id);

-- Audit Logs ---------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_id_idx on public.audit_logs (organization_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- Usage Tracking ------------------------------------------------------------------

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  event_type text not null,
  quantity numeric not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index usage_events_org_id_idx on public.usage_events (organization_id);
create index usage_events_created_at_idx on public.usage_events (created_at desc);

-- Helper functions ----------------------------------------------------------------

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org_id and user_id = auth.uid()
  );
$$;

create or replace function public.org_role(target_org_id uuid)
returns public.org_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.organization_members
  where organization_id = target_org_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false);
$$;

-- handle new auth user -> profile row -----------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at trigger ------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute procedure public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger crm_contacts_set_updated_at before update on public.crm_contacts
  for each row execute procedure public.set_updated_at();
create trigger kb_documents_set_updated_at before update on public.knowledge_base_documents
  for each row execute procedure public.set_updated_at();

-- Row Level Security ------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.knowledge_base_documents enable row level security;
alter table public.knowledge_base_chunks enable row level security;
alter table public.audit_logs enable row level security;
alter table public.usage_events enable row level security;

create policy "members can view their organization" on public.organizations
  for select using (public.is_org_member(id) or public.is_super_admin());

create policy "super admins manage organizations" on public.organizations
  for all using (public.is_super_admin());

create policy "users can view own profile" on public.profiles
  for select using (id = auth.uid() or public.is_super_admin());

create policy "users can update own profile" on public.profiles
  for update using (id = auth.uid());

create policy "members can view membership rows in their org" on public.organization_members
  for select using (public.is_org_member(organization_id) or public.is_super_admin());

create policy "admins manage membership" on public.organization_members
  for all using (
    public.org_role(organization_id) in ('owner', 'admin') or public.is_super_admin()
  );

create policy "members can view crm contacts" on public.crm_contacts
  for select using (public.is_org_member(organization_id) or public.is_super_admin());

create policy "members can write crm contacts" on public.crm_contacts
  for insert with check (public.is_org_member(organization_id));

create policy "members can update crm contacts" on public.crm_contacts
  for update using (public.is_org_member(organization_id));

create policy "admins can delete crm contacts" on public.crm_contacts
  for delete using (
    public.org_role(organization_id) in ('owner', 'admin') or public.is_super_admin()
  );

create policy "members can view kb documents" on public.knowledge_base_documents
  for select using (public.is_org_member(organization_id) or public.is_super_admin());

create policy "members can write kb documents" on public.knowledge_base_documents
  for insert with check (public.is_org_member(organization_id));

create policy "members can update kb documents" on public.knowledge_base_documents
  for update using (public.is_org_member(organization_id));

create policy "admins can delete kb documents" on public.knowledge_base_documents
  for delete using (
    public.org_role(organization_id) in ('owner', 'admin') or public.is_super_admin()
  );

create policy "members can view kb chunks" on public.knowledge_base_chunks
  for select using (public.is_org_member(organization_id) or public.is_super_admin());

create policy "members can write kb chunks" on public.knowledge_base_chunks
  for insert with check (public.is_org_member(organization_id));

create policy "members can view audit logs" on public.audit_logs
  for select using (public.is_org_member(organization_id) or public.is_super_admin());

create policy "system can insert audit logs" on public.audit_logs
  for insert with check (public.is_org_member(organization_id) or public.is_super_admin());

create policy "members can view usage events" on public.usage_events
  for select using (public.is_org_member(organization_id) or public.is_super_admin());

create policy "system can insert usage events" on public.usage_events
  for insert with check (public.is_org_member(organization_id) or public.is_super_admin());
