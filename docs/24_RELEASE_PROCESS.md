# 24 — Release Process

## Current Process

Eunoia AI OS uses continuous deployment via Vercel:

1. All development happens on `main` branch (single-developer workflow)
2. Push to `main` → Vercel auto-deploys to production
3. No manual deployment steps required after initial setup

---

## Pre-Release Checklist

Before pushing any significant change:

```bash
# 1. Type check
npx tsc --noEmit
# Expected: No errors

# 2. Lint
npm run lint
# Expected: No warnings or errors

# 3. Unit tests
npm test
# Expected: All passing

# 4. Build
npm run build
# Expected: Successful build with route count shown

# 5. Smoke test (if local server is running)
curl http://localhost:3000/api/health
# Expected: { "status": "ok", ... }
```

---

## Database Migration Release

If a release includes a new migration file:

1. Test the migration in a development Supabase project first
2. Create a backup of production database (manual, or verify auto-backup)
3. Apply migration in Supabase production → SQL Editor
4. Verify in Supabase Table Editor that schema changes are correct
5. Push code changes (which reference the new schema)
6. Monitor logs for errors after deployment

**Important**: Push code changes AFTER migrations are applied, not before. If code references a new RPC or column before the migration runs, the app will break.

---

## Rollback Procedure

### Code Rollback (< 1 minute)

1. Vercel dashboard → Project → Deployments
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"

### Migration Rollback

SQL migrations are generally not reversible automatically. To undo a migration:
1. Write a reverse migration that undoes the changes
2. Apply it in Supabase SQL Editor
3. Test thoroughly

**Prevention**: Always test migrations in a development project before applying to production.

---

## Version Tracking

The project does not currently use semantic versioning. Phase milestones serve as version markers:
- Phase 1: Complete (launched June 2026)
- Phase 2: In progress

When a formal versioning scheme is adopted, use `package.json` version and git tags:
```bash
git tag -a v1.0.0 -m "Phase 1 launch"
git push origin v1.0.0
```

---

## Feature Flags

There is currently no feature flag system. Features are either fully deployed or not deployed.

For experimental features in Phase 2+, consider:
- Environment variable flags (`NEXT_PUBLIC_FEATURE_X=true`)
- Supabase config table per organization
- Vercel Edge Config
