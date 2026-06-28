import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// Handles Supabase OAuth / magic-link PKCE code exchange.
// The proxy marks /auth/callback as a public route so unauthenticated
// callbacks can reach this handler.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    logger.error("[auth/callback] exchangeCodeForSession failed", { error: String(error) });
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
