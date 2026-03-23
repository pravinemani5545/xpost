import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  getAndDeleteOAuthState,
  storeTokensInVault,
} from "@/lib/x/oauth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  console.log("X Callback: code =", !!code, "state =", !!state);

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/dashboard?error=missing_params`
    );
  }

  // Validate state and get code_verifier
  const oauthState = await getAndDeleteOAuthState(state);
  console.log("X Callback: oauthState found =", !!oauthState);

  if (!oauthState) {
    return NextResponse.redirect(
      `${origin}/dashboard?error=invalid_state`
    );
  }

  // Verify authenticated user
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/x/callback`;
    console.log("X Callback: exchanging code for tokens");

    const { userClient, accessToken, refreshToken, expiresIn } =
      await exchangeCodeForTokens(
        code,
        oauthState.code_verifier,
        redirectUri
      );

    console.log("X Callback: tokens received, fetching user info");

    // Get X user info
    const { data: xUser } = await userClient.v2.me();
    console.log("X Callback: X user =", xUser.username);

    // Store tokens encrypted in Vault
    await storeTokensInVault(
      user.id,
      accessToken,
      refreshToken,
      expiresIn,
      xUser.id,
      xUser.username,
      xUser.name ?? null
    );

    console.log("X Callback: tokens stored, redirecting to dashboard");

    return NextResponse.redirect(
      `${origin}/dashboard?x_connected=true`
    );
  } catch (err) {
    console.error("X Callback error:", err);
    return NextResponse.redirect(
      `${origin}/dashboard?error=x_connect_failed`
    );
  }
}
