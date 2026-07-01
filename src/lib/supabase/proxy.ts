import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/auth/forgot-password",
  "/auth/update-password", // Password-reset page — reached via emailed link before session exists
  "/invite",               // Invite-accept page — reached by unauthenticated invitees
  "/manifest.webmanifest", // PWA manifest — must be publicly accessible
  "/sitemap.xml",          // SEO sitemap — must be publicly accessible
  "/api/live",
  "/api/health",
  "/api/metrics",          // Prometheus scrape endpoint — auth handled by METRICS_TOKEN
  "/monitoring-tunnel",    // Sentry event tunnel
  "/api/health-debug",     // TEMPORARY — remove after production diagnosis
];

export async function updateSession(request: NextRequest) {
  // ── Request correlation ────────────────────────────────────────────────────
  // Generate or forward a unique request ID for distributed tracing.
  // Every log entry in the request lifecycle should include this ID.
  //
  // Downstream access:
  //   Server Components / Server Actions: await (await headers()).get("x-request-id")
  //   Route handlers: request.headers.get("x-request-id")
  const requestId =
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    randomUUID();

  // Forward the request ID to all downstream handlers via request headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // ── Supabase session ───────────────────────────────────────────────────────
  // Guard: createServerClient throws if URL/key are missing. If env vars are
  // absent (misconfigured Vercel), safe-fail as unauthenticated rather than
  // crashing every route and taking the app offline.
  let user = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            // Rebuild the response preserving the request ID header.
            supabaseResponse = NextResponse.next({
              request: { headers: requestHeaders },
            });
            supabaseResponse.headers.set("x-request-id", requestId);
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      });
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Supabase unreachable or crashed: safe-fail as unauthenticated
    }
  }

  const path = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.includes(path);

  if (!user && !isPublicRoute) {
    // API routes must return structured JSON errors, not browser redirects.
    // A 302 → /login response breaks API clients (curl, monitoring tools, fetch).
    if (path.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "x-request-id": requestId,
          },
        }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set("x-request-id", requestId);
    return redirectResponse;
  }

  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set("x-request-id", requestId);
    return redirectResponse;
  }

  // Propagate the request ID on all successful responses.
  supabaseResponse.headers.set("x-request-id", requestId);
  return supabaseResponse;
}
