import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google OAuth redirects here with a one-time code (PKCE flow). We
// exchange it for a session, which the Supabase server client stores
// in cookies for the middleware/server components to read.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
