import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV !== "production";

// Read version once at build time — baked into the artifact, zero runtime I/O.
// Override by setting BUILD_VERSION in the CI/CD environment (e.g. git SHA or
// release tag). Falls back to package.json version for local dev.
function resolveBuildVersion(): string {
  if (process.env.BUILD_VERSION) return process.env.BUILD_VERSION;
  try {
    const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // unsafe-eval removed in production; Next.js compiled bundles do not need it.
      // It is retained in development for Turbopack's HMR runtime.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  env: {
    // Available as process.env.BUILD_VERSION in all server and client code.
    // Value is frozen at `next build` time — changing the env var after the
    // build has no effect until the next build.
    BUILD_VERSION: resolveBuildVersion(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry webpack plugin — source map upload and release tracking.
// Only active when SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT are set.
// Safe to leave unconfigured in local dev; the build proceeds without errors.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress upload logs unless explicitly running a CI release build.
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for production error deobfuscation.
  widenClientFileUpload: true,

  // Delete source maps from .next/ after uploading to Sentry.
  // Source map comments are still injected by the compiler — only the files are removed.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Suppress Sentry's internal logger in Next.js server output.
  disableLogger: true,

  // Route Sentry events through the same origin (/monitoring-tunnel) to avoid
  // CSP issues and ad-blockers. 'self' in connect-src already covers this route.
  tunnelRoute: "/monitoring-tunnel",

  // Auto-instrument Vercel Cron Monitors is not needed yet.
  automaticVercelMonitors: false,
});
