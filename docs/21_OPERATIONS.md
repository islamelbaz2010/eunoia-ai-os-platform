# 21 — Operations

## Health Check

```bash
curl https://eunoiaos.com/api/health
# Expected: { "status": "ok", "ts": ..., "checks": { "db": "ok" } }
```

If `status` is `degraded`:
- `checks.db = "unreachable"` → Supabase is down or URL is wrong
- `checks.db = "error:STATUS"` → Supabase returned an error (check status page)
- `checks.db = "misconfigured"` → Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY

---

## Grant Super Admin Access

Run in Supabase SQL Editor:
```sql
UPDATE public.profiles
SET is_super_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

---

## Revoke Super Admin

```sql
UPDATE public.profiles
SET is_super_admin = false
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

---

## View All Organizations (Super Admin panel)

Log in as super admin → `/dashboard/admin`

Or via SQL:
```sql
SELECT id, name, slug, created_at FROM organizations ORDER BY created_at DESC;
```

---

## View Audit Log for Organization

```sql
SELECT al.action, al.target_type, al.target_id, al.metadata, al.created_at,
       p.full_name as actor_name
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.actor_id
WHERE al.organization_id = 'YOUR_ORG_UUID'
ORDER BY al.created_at DESC
LIMIT 100;
```

---

## Find Organization by Slug

```sql
SELECT * FROM organizations WHERE slug = 'your-org-slug';
```

---

## Count Usage by Event Type

```sql
SELECT event_type, SUM(quantity) as total
FROM usage_events
WHERE organization_id = 'YOUR_ORG_UUID'
GROUP BY event_type
ORDER BY total DESC;
```

---

## Find a User's Organizations

```sql
SELECT o.name, o.slug, om.role, om.created_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

---

## Manually Accept an Invite

If a user can't access the invite link:
```sql
-- First: Find the invite
SELECT id, token, email, role, status, expires_at
FROM organization_invites
WHERE email = 'user@example.com' AND status = 'pending';

-- Then: Manually accept (as service role, bypasses auth.uid() check)
INSERT INTO organization_members (organization_id, user_id, role)
VALUES (
  'ORG_UUID',
  (SELECT id FROM auth.users WHERE email = 'user@example.com'),
  'member'
)
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = excluded.role;

UPDATE organization_invites SET status = 'accepted' WHERE id = 'INVITE_UUID';
```

---

## Manually Revoke a Pending Invite

```sql
UPDATE organization_invites
SET status = 'revoked'
WHERE id = 'INVITE_UUID';
```

---

## Delete a Knowledge Base Document and Its Chunks

```sql
-- Chunks are deleted automatically by ON DELETE CASCADE
DELETE FROM knowledge_base_documents WHERE id = 'DOC_UUID';
```

---

## Re-embed a Document (Manual)

If embedding is corrupt or outdated:
1. Delete old chunks: `DELETE FROM knowledge_base_chunks WHERE document_id = 'DOC_UUID';`
2. Use the integration script to re-embed, or trigger re-ingestion through the app (delete + re-add document)

Note: The app currently has no UI for re-ingestion. This must be done manually or via a custom script.

---

## Vercel Deployment Rollback

1. Go to vercel.com → Project → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

No re-build required. Takes ~30 seconds.

---

## OpenAI Usage Monitoring

Monitor costs at: platform.openai.com → Usage

Key metrics to watch:
- `text-embedding-3-small` token usage (per document ingestion + per query)
- `gpt-4o-mini` token usage (per query)

Set usage limits in OpenAI dashboard to avoid unexpected bills.

---

## Supabase Database Size

Monitor in Supabase dashboard → Project Settings → Usage.

The `knowledge_base_chunks` table is the largest (1536 float32 dims per vector = 6KB per chunk). At 1000 documents × 10 chunks = 10,000 chunks × 6KB = 60MB. Free plan has 500MB database limit.
