// PM2 process configuration — single source of truth for all environments.
//
// Quick-start:
//   Production:  npm run build && pm2 start ecosystem.config.js --env production
//   Staging:     npm run build && pm2 start ecosystem.config.js --env staging
//   Development: pm2 start ecosystem.config.js  (uses env.development defaults)
//
// Reload (zero-downtime after deploy):
//   pm2 reload eunoia --update-env
//   pm2 reload eunoia-staging --update-env
//
// Logs:
//   pm2 logs eunoia
//   pm2 logs eunoia --lines 200 --err
//
// Monitor:
//   pm2 monit
//
// Save state (survives server restart):
//   pm2 save && pm2 startup

module.exports = {
  apps: [
    // ── Production ────────────────────────────────────────────────────────────
    {
      name: "eunoia",

      // Call next directly — avoids a Node subprocess PM2 can't monitor for
      // memory/CPU. next start reads PORT from env automatically.
      script: "./node_modules/.bin/next",
      args: "start",

      // Single instance: Next.js manages its own worker threads internally.
      // Do NOT use cluster mode — it conflicts with Next.js App Router's RSC
      // streaming and causes duplicate module loading.
      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      // Exponential backoff: wait 1s, 2s, 4s... up to 60s between restarts.
      exp_backoff_restart_delay: 1000,

      // Log to ~/.pm2/logs/ by default. Override with absolute paths for VPS.
      out_file: "~/.pm2/logs/eunoia-out.log",
      error_file: "~/.pm2/logs/eunoia-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Graceful shutdown: give Next.js 10s to drain in-flight requests.
      kill_timeout: 10000,
      listen_timeout: 15000,

      env: {
        // Development defaults (used when no --env flag is passed).
        // All secrets come from .env.local — never put them here.
        NODE_ENV: "development",
        PORT: 3000,
        LOG_LEVEL: "debug",
      },

      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        LOG_LEVEL: "info",
        // Secrets must be in .env.local or system environment.
        // Next.js reads .env.local at startup before any request is served.
      },

      env_staging: {
        NODE_ENV: "production",  // Next.js optimises for "production"
        PORT: 3001,              // Different port so prod and staging can coexist
        LOG_LEVEL: "debug",
        // Staging uses its own .env.local (or .env.staging) with staging credentials.
      },
    },

    // ── Staging ───────────────────────────────────────────────────────────────
    // Separate PM2 process for staging. Run with --env staging on port 3001.
    // Uncomment and deploy to a staging server to enable.
    //
    // {
    //   name: "eunoia-staging",
    //   script: "./node_modules/.bin/next",
    //   args: "start",
    //   instances: 1,
    //   exec_mode: "fork",
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: "512M",
    //   exp_backoff_restart_delay: 1000,
    //   out_file: "~/.pm2/logs/eunoia-staging-out.log",
    //   error_file: "~/.pm2/logs/eunoia-staging-error.log",
    //   merge_logs: true,
    //   log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    //   kill_timeout: 10000,
    //   listen_timeout: 15000,
    //   env_staging: {
    //     NODE_ENV: "production",
    //     PORT: 3001,
    //     LOG_LEVEL: "debug",
    //   },
    // },
  ],
};
