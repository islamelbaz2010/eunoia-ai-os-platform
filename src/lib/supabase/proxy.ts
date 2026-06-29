import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/auth/forgot-password",
  "/api/live",
  "/api/health",
  "/api/metrics",       // Prometheus scrape endpoint — auth handled by METRICS_TOKEN
  "/monitoring-tunnel", // Sentry event tunnel
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
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
