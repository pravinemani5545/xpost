import { TwitterApi } from "twitter-api-v2";
import { createServiceClient } from "@/lib/supabase/server";
import { storeSecret, getSecret, updateSecret } from "@/lib/vault";
import { getTwitterAuthClient } from "./client";

const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

export function generateAuthLink(redirectUri: string) {
  const client = new TwitterApi({ clientId: process.env.X_CLIENT_ID! });
  return client.generateOAuth2AuthLink(redirectUri, { scope: SCOPES });
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
) {
  const client = getTwitterAuthClient();
  const {
    client: userClient,
    accessToken,
    refreshToken,
    expiresIn,
  } = await client.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri,
  });

  return { userClient, accessToken, refreshToken: refreshToken!, expiresIn };
}

export async function storeOAuthState(
  userId: string,
  state: string,
  codeVerifier: string
) {
  const supabase = createServiceClient();
  await supabase.from("oauth_states").insert({
    user_id: userId,
    state,
    code_verifier: codeVerifier,
  });
}

export async function getAndDeleteOAuthState(state: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .single();

  if (error || !data) return null;

  // Delete used state
  await supabase.from("oauth_states").delete().eq("id", data.id);

  return data;
}

export async function storeTokensInVault(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  xUserId: string,
  xUsername: string,
  xDisplayName: string | null
) {
  const accessTokenId = await storeSecret(
    `x_access_token_${userId}`,
    accessToken
  );
  const refreshTokenId = await storeSecret(
    `x_refresh_token_${userId}`,
    refreshToken
  );

  const tokenExpiresAt = new Date(
    Date.now() + expiresIn * 1000
  ).toISOString();

  const supabase = createServiceClient();
  await supabase.from("x_connections").upsert(
    {
      user_id: userId,
      x_user_id: xUserId,
      x_username: xUsername,
      x_display_name: xDisplayName,
      access_token_id: accessTokenId,
      refresh_token_id: refreshTokenId,
      token_expires_at: tokenExpiresAt,
    },
    { onConflict: "user_id" }
  );
}

export async function refreshTokenIfNeeded(
  userId: string
): Promise<string> {
  const supabase = createServiceClient();
  const { data: conn, error } = await supabase
    .from("x_connections")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !conn) throw new Error("No X connection found");

  const expiresAt = new Date(conn.token_expires_at).getTime();
  const tenMinutes = 10 * 60 * 1000;

  // If token is still valid for >10 min, return existing token
  if (Date.now() + tenMinutes < expiresAt) {
    return getSecret(conn.access_token_id);
  }

  // Refresh the token
  const refreshToken = await getSecret(conn.refresh_token_id);
  const client = getTwitterAuthClient();
  const {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn,
  } = await client.refreshOAuth2Token(refreshToken);

  // Update Vault secrets
  await updateSecret(conn.access_token_id, newAccessToken);
  if (newRefreshToken) {
    await updateSecret(conn.refresh_token_id, newRefreshToken);
  }

  // Update expiry in DB
  const newExpiresAt = new Date(
    Date.now() + expiresIn * 1000
  ).toISOString();
  await supabase
    .from("x_connections")
    .update({ token_expires_at: newExpiresAt })
    .eq("user_id", userId);

  return newAccessToken;
}
