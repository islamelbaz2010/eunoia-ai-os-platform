# Exhibition Scripts

Automation suite for Eunoia AI OS exhibition readiness.

## One-Command Launch

```bash
./scripts/exhibition/launch.sh
```

This runs the full pipeline: pre-flight → Vercel sync → verify Supabase → verify Stripe → verify Resend → demo seeding → smoke tests → health checks → launch report → opens browser.

---

## Scripts

### `launch.sh` — Full Exhibition Launch Pipeline

The primary script. Runs everything in order and opens the production URL.

```bash
./scripts/exhibition/launch.sh
./scripts/exhibition/launch.sh --dry-run        # preview without changes
./scripts/exhibition/launch.sh --skip-bootstrap # skip Vercel env sync
./scripts/exhibition/launch.sh --skip-seed      # skip demo account seeding
```

**Phases:**
1. Pre-flight (TypeScript + tests + required env vars)
2. Bootstrap (sync env vars to Vercel)
3. Verify Supabase
4. Verify Stripe
5. Verify Resend
6. Demo preparation (seed demo account)
7. Production health checks
8. Smoke tests
9. Launch report → open browser

---

### `prepare-demo.sh` — Exhibition Preparation

Runs quality gates → system verification → demo seeding → smoke tests → generates report.

```bash
./scripts/exhibition/prepare-demo.sh
./scripts/exhibition/prepare-demo.sh --skip-seed   # if already seeded
./scripts/exhibition/prepare-demo.sh --skip-tests  # faster iteration
```

**Output:** `docs/exhibition-live/PREPARE_REPORT.md`

---

### `verify.sh` — System Verification

Verifies all subsystems and outputs PASS/FAIL for each.

```bash
./scripts/exhibition/verify.sh
./scripts/exhibition/verify.sh --local-only   # skip production HTTP tests
./scripts/exhibition/verify.sh --fast         # skip slow external API calls
```

**Checks:** Environment vars, Supabase REST API, Auth, OpenAI, Resend, Stripe, Production health, Security headers, Public pages, Protected routes, API auth, Streaming, Landing page, KB, CRM, Billing.

---

### `seed-demo.sh` — Demo Account Seeder

Seeds a complete demo environment in production Supabase.

```bash
./scripts/exhibition/seed-demo.sh
./scripts/exhibition/seed-demo.sh --dry-run   # preview without writing
./scripts/exhibition/seed-demo.sh --reset     # delete and re-seed
```

**Demo credentials:**
- URL: https://eunoia-ai-os-platform.vercel.app/login
- Email: `demo@eunoiaos.com`
- Password: `EunoiaDemo2026!`
- Organization: Grand Nile Tower Hotel

**What is seeded:**
- 5 Knowledge Base documents (VIP Protocol, F&B Menu, Check-in/out, Emergency Response, Staff Grooming)
- 6 CRM contacts at different pipeline stages
- 14 days of usage events for dashboard charts
- Audit log entries

**Requires:** `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` in `.env.local`

---

### `collect-system-report.sh` — System Report Generator

Generates a complete system state snapshot.

```bash
./scripts/exhibition/collect-system-report.sh
./scripts/exhibition/collect-system-report.sh --offline   # skip HTTP checks
```

**Output:** `docs/exhibition-live/SYSTEM_REPORT.md`

**Captures:**
- Git SHA, branch, last commit, dirty state
- Test results
- TypeScript and lint status
- Route inventory
- Environment variable matrix (set/missing)
- Production health endpoint status
- Dependency versions
- Migration manifest
- Action items

---

### `backup.sh` — Pre-Exhibition Snapshot

Creates a timestamped snapshot of code state and configuration.

```bash
./scripts/exhibition/backup.sh
./scripts/exhibition/backup.sh --tag   # also creates a git tag
```

**Output:** `docs/exhibition-live/backups/<timestamp>/`

**Captures:**
- Git state (branch, SHA, last 10 commits)
- Environment variable key names (no values)
- package.json and lockfile metadata
- Database table accessibility check
- Migration file list

---

### `rollback.sh` — Emergency Rollback

Rolls back production to the previous Vercel deployment.

```bash
./scripts/exhibition/rollback.sh              # rollback to previous
./scripts/exhibition/rollback.sh --list       # list recent deployments
./scripts/exhibition/rollback.sh --git abc123 # redeploy specific SHA
```

**Requires:** Vercel CLI (`npm install -g vercel`) and `vercel login`

---

## Typical Exhibition Workflow

### Day Before

```bash
# 1. Snapshot current state
./scripts/exhibition/backup.sh --tag

# 2. Seed demo data
./scripts/exhibition/seed-demo.sh

# 3. Verify everything
./scripts/exhibition/verify.sh

# 4. Generate system report
./scripts/exhibition/collect-system-report.sh
```

### Exhibition Day (morning)

```bash
# Full launch pipeline — one command
./scripts/exhibition/launch.sh
```

### If Something Goes Wrong

```bash
# Check what's failing
./scripts/exhibition/verify.sh

# Emergency rollback
./scripts/exhibition/rollback.sh
```

---

## Demo Script (What to Show)

1. **Login** — demo@eunoiaos.com / EunoiaDemo2026!
2. **Dashboard** — KPIs, 14-day activity chart, live data
3. **AI Assistant** — "What is the VIP late checkout policy?"
4. **AI Follow-up** — "Does the sea bass contain dairy?"
5. **Knowledge Base** — show 5 documents, explain semantic search
6. **CRM** — pipeline from Lead → Won, 6 contacts
7. **Settings** — team member management, role-based access
8. **Health** — https://eunoia-ai-os-platform.vercel.app/api/health

---

## Environment Requirements

Scripts that need `.env.local`:
- `verify.sh` — reads `NEXT_PUBLIC_SUPABASE_URL` etc.
- `seed-demo.sh` — requires `SUPABASE_SERVICE_ROLE_KEY` + `OPENAI_API_KEY`
- `launch.sh` — reads all vars for verification

Copy `.env.example` to `.env.local` and fill in values.
