import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Where Google sends the user back after consent. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/tasks";

  // Behind Vercel's proxy the request origin is the internal host, so prefer
  // the forwarded one when building the final redirect.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  // Only ever redirect to a path on this app, never to an attacker-supplied host.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/tasks";

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${base}${safeNext}`);
}
