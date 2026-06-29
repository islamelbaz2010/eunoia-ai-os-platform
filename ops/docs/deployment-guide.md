# Deployment Guide

## Overview

Eunoia AI OS supports three deployment targets:
1. **Vercel** (recommended for production)
2. **PM2 on VPS** (self-hosted, single server)
3. **Docker** (containerised, single or multi-server)

---

## Option A — Vercel (Recommended)

### Initial setup

1. Push code to GitHub (main branch)
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Framework: **Next.js** (auto-detected)
4. Add environment variables (Settings → Environment Variables)
5. Deploy

### Deploy (automatic)

Every push to `main` triggers a Vercel deployment automatically.

### Deploy (manual)

```bash
# Via Vercel CLI
npm install -g vercel
vercel --prod
```

### Key Vercel settings

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Node.js version | 20.x |
| Build command | `npm run build` |
| Output directory | `.next` |
| Install command | `npm ci` |

---

## Option B — PM2 on VPS

### First-time setup

```bash
# On the server
git clone https://github.com/your-org/eunoia-ai-os-platform.git /opt/eunoia
cd /opt/eunoia
cp .env.example .env.local
nano .env.local  # fill in all values

npm ci
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | tail -1 | bash
```

### Ongoing deploys

```bash
./ops/deploy/deploy.sh
```

The deploy script handles: pull, lint, tsc, test, build, PM2 reload, health check, auto-rollback.

### Manual deploy (step by step)

```bash
git pull origin main
npm ci --prefer-offline
npm run lint && npx tsc --noEmit && npm test
npm run build
pm2 reload eunoia --update-env
```

---

## Option C — Docker

### Build image

```bash
BUILD_VERSION=$(git rev-parse --short HEAD)
docker build \
  --build-arg BUILD_VERSION=$BUILD_VERSION \
  -t eunoia-ai-os:$BUILD_VERSION \
  -t eunoia-ai-os:latest \
  .
```

### Run in production

```bash
BUILD_VERSION=$(git rev-parse --short HEAD) \
docker compose -f docker-compose.production.yml up -d
```

### Update (rolling restart)

```bash
BUILD_VERSION=$(git rev-parse --short HEAD) \
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --no-deps app
```

---

## Post-Deploy Verification

After any deployment method:

```bash
./ops/monitoring/healthcheck.sh
```

Expected: `/api/live` → 200, `/api/health` → 200 healthy=true.

---

## Next.js Standalone Mode (for Docker)

To reduce Docker image size, enable standalone output in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ... rest of config
};
```

This bundles only the files needed to run the app (~50MB vs ~500MB full build).

The Dockerfile already includes the commands for standalone mode.

---

## Rollback

See `ops/deploy/rollback.sh` or `docs/runbooks/rollback.md`.
