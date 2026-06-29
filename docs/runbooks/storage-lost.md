# Storage Lost — Runbook

**Scenario**: Supabase Storage bucket is deleted, corrupted, or files are lost.

**Severity**: SEV2 (file uploads unavailable; core features continue)

---

## Confirm Scope

```bash
curl https://yourdomain.com/api/health | jq '.providers.storage'
```

If `status: "error"` — diagnose with `storage-down.md`.

If bucket is deleted or files are missing, follow this runbook.

---

## Recreate the Bucket

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: match the bucket name referenced in your code
3. Set access policy:
   - **Private**: for user-uploaded documents (recommended)
   - **Public**: for publicly accessible assets

## Restore Files from Backup

If you have a Supabase Pro/Enterprise plan with PITR:
- Supabase Dashboard → Database → Backups → restore to before deletion

If using `ops/backup/backup.sh --type storage`:
```bash
./ops/restore/restore.sh --from .backups/daily/<timestamp> --type storage
```

## Re-ingest Knowledge Base Documents

If document files are lost but the database records remain (embeddings survive):
- Documents may display with broken links
- Re-upload documents manually through the Knowledge Base UI
- The ingest pipeline will re-embed automatically on upload

---

## Prevention

- Supabase Pro PITR covers Storage objects as well as database
- Implement object-level deletion protection in Supabase RLS policies
- Consider S3 cross-region replication for critical files
