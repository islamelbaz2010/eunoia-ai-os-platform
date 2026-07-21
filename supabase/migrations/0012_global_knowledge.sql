-- 0012_global_knowledge.sql
-- Global Knowledge layer: shared knowledge accessible to all organizations.
-- Documents here are not org-scoped and are surfaced in all RAG queries.

-- Global knowledge documents --------------------------------------------------

create table public.global_knowledge_documents (
  id          uuid    primary key default gen_random_uuid(),
  title       text    not null,
  content     text    not null,
  source_path text,
  language    text    not null default 'en',
  category    text    not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index global_knowledge_documents_category_idx
  on public.global_knowledge_documents (category);

create trigger global_knowledge_documents_set_updated_at
  before update on public.global_knowledge_documents
  for each row execute procedure public.set_updated_at();

-- Global knowledge chunks (vectors) ------------------------------------------

create table public.global_knowledge_chunks (
  id          uuid      primary key default gen_random_uuid(),
  document_id uuid      not null references public.global_knowledge_documents (id) on delete cascade,
  content     text      not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now()
);

create index global_knowledge_chunks_document_id_idx
  on public.global_knowledge_chunks (document_id);

create index global_knowledge_chunks_embedding_idx
  on public.global_knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

-- RLS: global knowledge is readable by any authenticated user.
-- Writes are service_role only (import scripts).

alter table public.global_knowledge_documents enable row level security;
alter table public.global_knowledge_chunks     enable row level security;

create policy "authenticated users can read global documents"
  on public.global_knowledge_documents
  for select
  using (auth.role() = 'authenticated');

create policy "authenticated users can read global chunks"
  on public.global_knowledge_chunks
  for select
  using (auth.role() = 'authenticated');

-- Grants (mirror pattern from 0003_grants.sql) --------------------------------

grant select on public.global_knowledge_documents to authenticated;
grant select on public.global_knowledge_chunks     to authenticated;

grant all    on public.global_knowledge_documents to service_role;
grant all    on public.global_knowledge_chunks     to service_role;

-- Updated match_kb_chunks: UNION org-specific + global chunks -----------------
-- Signature unchanged: backward-compatible drop-in replacement.

create or replace function public.match_kb_chunks(
  query_embedding vector(1536),
  target_org_id   uuid,
  match_count     int default 6
)
returns table (
  id          uuid,
  document_id uuid,
  content     text,
  similarity  float
)
language sql
security definer
set search_path = public
stable
as $$
  -- Org-specific knowledge (unchanged from original implementation)
  select
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.knowledge_base_chunks c
  where c.organization_id = target_org_id
    and (public.is_org_member(target_org_id) or public.is_super_admin())

  union all

  -- Global knowledge: shared across all organizations
  select
    gc.id,
    gc.document_id,
    gc.content,
    1 - (gc.embedding <=> query_embedding) as similarity
  from public.global_knowledge_chunks gc

  order by similarity desc
  limit match_count;
$$;
