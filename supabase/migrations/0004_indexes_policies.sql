-- Eunoia AI OS — missing indexes and RLS policies

-- Indexes -----------------------------------------------------------------

-- Re-ingestion deletes by document_id; without this index it's a full table scan
create index if not exists kb_chunks_document_id_idx
  on public.knowledge_base_chunks (document_id);

-- KB document list sorted by updated_at desc
create index if not exists kb_documents_updated_at_idx
  on public.knowledge_base_documents (organization_id, updated_at desc);

-- Audit log time-range queries
create index if not exists audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);

-- Usage event aggregation
create index if not exists usage_events_org_type_idx
  on public.usage_events (organization_id, event_type);

-- RLS policies -------------------------------------------------------------

-- Members can delete their own org's chunks (required for re-ingestion)
create policy "members can delete kb chunks" on public.knowledge_base_chunks
  for delete using (public.is_org_member(organization_id) or public.is_super_admin());

-- Members can update kb documents (status changes, edits)
create policy "members can update kb documents" on public.knowledge_base_documents
  for update using (public.is_org_member(organization_id));
