# Database Lost — Runbook

**Scenario**: Supabase database is irreversibly lost or corrupted.

**Severity**: SEV1 (catastrophic — all application data at risk)

**Note**: This is an extremely rare scenario. Supabase Pro/Enterprise plans include automated daily PITR (Point-In-Time Recovery) and never truly "lose" data. This runbook covers edge cases: wrong project deleted, migration gone wrong, or full data corruption.

---

## First: Confirm the Scope

Before taking any action, confirm what is actually lost:

```bash
# Check if Supabase is just temporarily down
curl https://status.supabase.com/api/v2/status.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status']['description'])"

# Check if YOUR project is accessible
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
     -o /dev/null -w "%{http_code}\n"
```

**If this returns 200**: database is up, this is not a database-lost scenario. See `database-down.md`.

---

## Recovery Option A — Supabase PITR (Fastest, Pro/Enterprise only)

1. Supabase Dashboard → **Database** → **Backups** → **Point in Time Recovery**
2. Select a recovery point (up to 7 days on Pro, 30 days on Enterprise)
3. Click **Restore**
4. Wait ~10–30 minutes for restoration

**This is the recommended path.** Supabase handles all data and schema restoration.

---

## Recovery Option B — Manual restore from pg_dump backup

Only applicable if you have a pg_dump backup from `ops/backup/backup.sh`.

```bash
# List available backups
ls .backups/

# Restore from backup
./ops/restore/restore.sh --from .backups/daily/20260629_030000 --type db
```

Prerequisites: `DATABASE_URL` must be set and `pg_restore`/`psql` must be installed.

**Warning**: This restores data to the state at backup time. All changes since the last backup are lost.

---

## Recovery Option C — Recreate from migrations

If data loss is acceptable (e.g., dev/staging database):

```bash
# Apply all migrations in order
for f in supabase/migrations/*.sql; do
  echo "Applying $f..."
  psql "$DATABASE_URL" < "$f"
done
```

This recreates schema only — no data is recovered.

---

## Recovery Option D — New Supabase project

If the original project is permanently deleted:

1. Create a new Supabase project
2. Apply all migrations:
   ```bash
   for f in supabase/migrations/*.sql; do psql "$NEW_DATABASE_URL" < "$f"; done
   ```
3. Update environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` → new project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → new anon key
   - `SUPABASE_SERVICE_ROLE_KEY` → new service role key
4. Redeploy the application
5. Notify all users — they will need to re-register

---

## Post-Recovery

```bash
# Verify database health
./ops/monitoring/healthcheck.sh | grep database

# Verify auth
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -o /dev/null -w "%{http_code}"
```

---

## Prevention

| Measure | How |
|---------|-----|
| PITR enabled | Upgrade to Supabase Pro ($25/month) |
| Daily pg_dump | `ops/backup/backup.sh` via cron |
| Migration version control | All `.sql` files in `supabase/migrations/` |
| Staging environment | Test destructive changes on staging first |
| RLS on all tables | Prevents accidental data deletion by API |
