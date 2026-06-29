# ── Eunoia AI OS — Production Dockerfile (multi-stage) ───────────────────────
#
# Build:
#   docker build --build-arg BUILD_VERSION=$(git rev-parse --short HEAD) \
#                -t eunoia-ai-os:latest .
#
# Run:
#   docker run -p 3000:3000 --env-file .env.local eunoia-ai-os:latest
#
# Notes:
#   - Uses Node.js 20 Alpine for minimal image size
#   - Multi-stage build: deps → builder → runner
#   - Runs as non-root user (nextjs:nodejs)
#   - Next.js standalone output mode for minimal runtime dependencies
#   - Health check wired to /api/live

# ── Stage 1: Dependencies ─────────────────────────────────────────────────────

FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies based on lock file for deterministic builds
COPY package.json package-lock.json ./
RUN npm ci --only=production --prefer-offline

# ── Stage 2: Builder ──────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Copy all deps (including devDeps needed for build)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

COPY . .

# Inject build version from git SHA (passed as --build-arg)
ARG BUILD_VERSION=unknown
ENV BUILD_VERSION=${BUILD_VERSION}
ENV NEXT_TELEMETRY_DISABLED=1

# Enable standalone output for minimal runtime bundle
# Add to next.config.ts: output: "standalone"
# (see ops/docs/deployment-guide.md for instructions)
RUN npm run build

# ── Stage 3: Runner ───────────────────────────────────────────────────────────

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone build (if output: "standalone" is set in next.config.ts)
# If not using standalone, copy full .next directory instead.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

# Fallback: if not using standalone, use this instead of the COPY above:
# COPY --from=builder --chown=nextjs:nodejs /app/.next        ./.next
# COPY --from=deps    --chown=nextjs:nodejs /app/node_modules ./node_modules
# COPY --from=builder --chown=nextjs:nodejs /app/public       ./public
# COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# Health check: uses /api/live — liveness probe, no external deps
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/live | grep -q '"status":"live"' || exit 1

# Standalone mode entry point
CMD ["node", "server.js"]

# Non-standalone mode entry point (uncomment if not using standalone):
# CMD ["./node_modules/.bin/next", "start"]
