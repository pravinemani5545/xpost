import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateAuthLink, storeOAuthState } from "@/lib/x/oauth";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/x/callback`;
  const { url, codeVerifier, state } = generateAuthLink(redirectUri);

  // Store state and codeVerifier server-side (in DB, not cookie)
  await storeOAuthState(user.id, state, codeVerifier);

  return NextResponse.redirect(url);
}
