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

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/dashboard?error=missing_params`
    );
  }

  // Validate state and get code_verifier
  const oauthState = await getAndDeleteOAuthState(state);
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
    const { userClient, accessToken, refreshToken, expiresIn } =
      await exchangeCodeForTokens(
        code,
        oauthState.code_verifier,
        redirectUri
      );

    // Get X user info
    const { data: xUser } = await userClient.v2.me();

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

    return NextResponse.redirect(
      `${origin}/dashboard?x_connected=true`
    );
  } catch {
    return NextResponse.redirect(
      `${origin}/dashboard?error=x_connect_failed`
    );
  }
}
