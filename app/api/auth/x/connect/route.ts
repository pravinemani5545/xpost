import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateAuthLink, storeOAuthState } from "@/lib/x/oauth";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/x/callback`;
    console.log("X Connect: redirectUri =", redirectUri);
    console.log("X Connect: X_CLIENT_ID set =", !!process.env.X_CLIENT_ID);

    const { url, codeVerifier, state } = generateAuthLink(redirectUri);
    console.log("X Connect: auth URL generated");

    await storeOAuthState(user.id, state, codeVerifier);
    console.log("X Connect: state stored, redirecting");

    return NextResponse.redirect(url);
  } catch (err) {
    console.error("X Connect error:", err);
    return NextResponse.json(
      { error: "Failed to initiate X connection", detail: String(err) },
      { status: 500 }
    );
  }
}
