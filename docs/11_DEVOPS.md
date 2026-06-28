# 11 — DevOps

## CI/CD Pipeline

### Current State

There is **no GitHub Actions CI pipeline**. Deployments happen via Vercel's built-in Git integration:

1. Developer pushes to `main`
2. Vercel automatically detects the push
3. Vercel runs `npm run build`
4. If build succeeds → deploys to production
5. If build fails → deployment is blocked, previous version stays live

**This means**: TypeScript errors and ESLint errors only caught if the build fails. No automated test run in CI.

### Recommended CI Addition

Add `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
```

---

## Local Development

```bash
npm run dev   # Turbopack dev server, http://localhost:3000
```

Turbopack is the default in Next.js 16. It is configured in `next.config.ts`:
```typescript
turbopack: { root: __dirname }
```

The `root: __dirname` is required for correct path resolution — without it, some module resolution edge cases fail in Turbopack.

---

## Build Verification

Before any deployment:
```bash
npm run build     # Must produce 0 errors
npm run lint      # Must produce 0 warnings (Next.js ESLint config)
npx tsc --noEmit  # Must produce 0 type errors
npm test          # All unit tests must pass
```

---

## Integration Validation

Before applying database changes or after major feature work:
```bash
node scripts/test-rag.js   # Full 7-step pipeline test
```

This test creates real data, runs real AI queries, and cleans up after itself. It requires `.env.local` with `SUPABASE_SERVICE_ROLE_KEY`.

---

## Health Monitoring

Set up uptime monitoring for:
```
https://eunoiaos.com/api/health
```

Recommended services: Uptime Robot (free), Better Uptime, or Vercel's built-in monitoring.

Alert on:
- Status != "ok"
- Response time > 5 seconds
- HTTP status != 200

---

## Database Migration Process

1. Write migration SQL in `supabase/migrations/XXXX_description.sql`
2. Test locally (if running Supabase local dev)
3. Apply in Supabase dashboard → SQL Editor
4. Commit the migration file to git
5. Document in `docs/16_CHANGELOG.md`

**Never**:
- Apply migrations directly to production without testing
- Delete migration files (they are the database history)
- Modify applied migrations

---

## Vercel Project Settings

Key settings to verify in Vercel dashboard:
- **Framework preset**: Next.js (auto-detected)
- **Build command**: `npm run build` (default)
- **Output directory**: `.next` (default)
- **Node.js version**: 20.x (matches `.nvmrc` and `engines`)
- **Environment variables**: See [20_ENVIRONMENT.md](20_ENVIRONMENT.md)

---

## Deployment Checklist

Before each production deployment:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes  
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] Any new migrations applied to Supabase
- [ ] New environment variables added to Vercel
- [ ] Health check passes after deployment

---

## Log Access

**Vercel logs**: Dashboard → Project → Functions → View logs  
**Format**: JSON (structured by `src/lib/logger.ts`)  
**Fields**: `level`, `message`, `ts`, optional context fields

Filter by level:
```
level:error
```

Filter by module:
```
[assistant]
[audit]
[ingest]
```
