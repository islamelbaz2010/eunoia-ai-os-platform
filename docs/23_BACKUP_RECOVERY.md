# 23 — Backup & Recovery

## Database Backups

### Supabase Free Plan

No automated backups on the free tier.

**Manual backup process** (recommended weekly):
```bash
# Requires Supabase CLI and project reference
supabase db dump --project-ref YOUR_PROJECT_REF > backup_$(date +%Y%m%d).sql
```

Or use the Supabase dashboard → Database → Backups → Manual backup.

### Supabase Pro Plan

- Daily automated backups, 7-day retention
- Downloadable backups from Supabase dashboard
- Point-in-time recovery (PITR) available

### Supabase Enterprise

- 30-day backup retention
- PITR with fine-grained restore

---

## What to Back Up

| Data | Location | Critical? |
|------|----------|----------|
| Organizations + members | `organizations`, `organization_members` | YES |
| User profiles | `profiles` (auth.users managed by Supabase) | YES |
| CRM contacts | `crm_contacts` | YES |
| KB documents | `knowledge_base_documents` | YES |
| KB chunk embeddings | `knowledge_base_chunks` | NO (regeneratable) |
| Audit logs | `audit_logs` | YES (compliance) |
| Invites | `organization_invites` | LOW |
| Usage events | `usage_events` | MEDIUM |

KB chunk embeddings can be regenerated from `knowledge_base_documents.content` using `node scripts/test-rag.js` logic, but requires OpenAI API calls.

---

## Recovery Procedures

### Restore from Backup

For Supabase Pro/Enterprise:
1. Supabase dashboard → Database → Backups
2. Select backup date → "Restore"
3. Wait for restore to complete (typically 5–30 minutes)

For manual backup:
```bash
psql YOUR_SUPABASE_DB_URL < backup_20260628.sql
```

### Recover Embeddings After Data Loss

If `knowledge_base_chunks` is lost but `knowledge_base_documents` survives:

```javascript
// Custom recovery script (adapt from scripts/test-rag.js pattern)
const docs = await supabase
  .from("knowledge_base_documents")
  .select("id, organization_id, content")

for (const doc of docs) {
  // Re-run ingestDocument for each document
  await ingestDocument({
    documentId: doc.id,
    organizationId: doc.organization_id,
    content: doc.content
  })
}
```

---

## Code Backups

- Source code is backed up via Git + GitHub (`islamelbaz2010/eunoia-ai-os-platform`)
- Every commit is permanent
- Migration files are committed to git — the database schema can always be reconstructed

---

## Environment Variable Backup

**DO NOT commit `.env.local` to git.**

Store credentials securely in a password manager:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

If Vercel project is deleted, Vercel environment variables are lost — they must be re-entered. Keep a copy in 1Password, Bitwarden, or similar.

---

## Disaster Recovery Scenario

**Scenario**: Vercel project accidentally deleted, Supabase free-tier database corrupted.

**Recovery steps**:
1. Create new Supabase project
2. Enable `pgcrypto` and `vector` extensions
3. Apply migrations 0001–0006
4. Create new Vercel project → import from GitHub
5. Set all environment variables in Vercel
6. Configure Supabase Auth redirect URLs
7. Promote to production
8. Restore from database backup if available
9. If no backup available: ask users to re-register (auth.users in Supabase Auth is not in the backup)

**RTO (Recovery Time Objective)**: 2–4 hours with backup; 1 day without backup (user re-registration)  
**RPO (Recovery Point Objective)**: Last manual backup (up to 7 days data loss on free tier)
