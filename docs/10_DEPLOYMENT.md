# 10 — Deployment

Step-by-step guide to deploy Eunoia AI OS to production.

---

## Prerequisites

- Supabase account with a new project created
- OpenAI API account with a key
- Vercel account connected to the GitHub repository
- Domain: eunoiaos.com (or any custom domain)
- Node.js 20+ installed locally

---

## Step 1: Prepare Supabase

### 1a. Enable Extensions

In Supabase dashboard → Database → Extensions:
- Enable `pgcrypto`
- Enable `vector` (pgvector)

### 1b. Apply Migrations

Go to Supabase dashboard → SQL Editor and run each migration in order:

```sql
-- 1. Run 0001_init.sql
-- 2. Run 0002_rag_invites.sql
-- 3. Run 0003_grants.sql
-- 4. Run 0004_indexes_policies.sql
-- 5. Run 0005_schema_hardening.sql
-- 6. Run 0006_hardening_v2.sql
```

**IMPORTANT**: Run them in order. Each migration depends on the previous.

### 1c. Configure Auth

In Supabase dashboard → Authentication → Settings:
- Set Site URL: `https://eunoiaos.com`
- Add Redirect URLs: `https://eunoiaos.com/auth/callback`
- Enable email confirmation (recommended for production)

### 1d. Copy Credentials

From Supabase dashboard → Project Settings → API:
- Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (local scripts only)

---

## Step 2: Set Up OpenAI

1. Go to platform.openai.com → API Keys → Create new secret key
2. Copy the key → `OPENAI_API_KEY`
3. Set usage limits to avoid bill shock

---

## Step 3: Deploy to Vercel

### 3a. Connect Repository

1. Go to vercel.com → New Project
2. Import `islamelbaz2010/eunoia-ai-os-platform` from GitHub
3. Framework: Next.js (auto-detected)

### 3b. Set Environment Variables

In Vercel → Project Settings → Environment Variables:

| Name | Value | Environments |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Production, Preview, Development |
| `OPENAI_API_KEY` | Your OpenAI key | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | `https://eunoiaos.com` | Production |

**Do NOT add `SUPABASE_SERVICE_ROLE_KEY`** to Vercel.

### 3c. Deploy

Click Deploy. Vercel will:
1. Install dependencies (`npm install`)
2. Build the app (`npm run build`)
3. Deploy to Vercel's edge network

---

## Step 4: Configure Custom Domain

1. Vercel → Project Settings → Domains
2. Add `eunoiaos.com`
3. Add DNS records as instructed by Vercel (usually an A record or CNAME)
4. Wait for DNS propagation (up to 24 hours)

---

## Step 5: Upload Brand Assets

Upload to `public/` directory and commit:
- `public/favicon.ico` — Browser favicon
- `public/icon.png` — PWA icon 192×192
- `public/icon-512.png` — PWA icon 512×512

---

## Step 6: Verify

### 6a. Health Check
```bash
curl https://eunoiaos.com/api/health
# Expected: { "status": "ok", "ts": ..., "checks": { "db": "ok" } }
```

### 6b. Full Integration Test (local)
```bash
# Set .env.local with production Supabase credentials
node scripts/test-rag.js
# Expected: === ALL CHECKS PASSED ===
```

### 6c. Smoke Test
1. Visit https://eunoiaos.com → landing page renders
2. Sign up as new user
3. Create an organization
4. Add a Knowledge Base document
5. Ask the RAG assistant a question
6. Verify answer cites the document

---

## Step 7: Create Super Admin

To grant super admin access to the founder account:

```sql
-- Run in Supabase SQL Editor
UPDATE public.profiles
SET is_super_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'islam.elbaz2010@gmail.com');
```

Then visit `/dashboard/admin` to see the Super Admin panel.

---

## Ongoing Deployments

Every `git push` to `main` triggers an automatic Vercel deployment. No manual steps needed after initial setup.

Migrations must be applied manually to Supabase when new migration files are added.

---

## Rollback

If a deployment breaks production:
1. Go to Vercel → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

This is instant — Vercel promotes the existing build artifact with no re-build.
