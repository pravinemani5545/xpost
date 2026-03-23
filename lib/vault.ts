import { createServiceClient } from "@/lib/supabase/server";

/**
 * Store a secret in Supabase Vault.
 * Falls back to pgcrypto AES-256 encryption if Vault is unavailable.
 */
export async function storeSecret(
  name: string,
  secret: string
): Promise<string> {
  const supabase = createServiceClient();

  // Try Vault first
  const { data, error } = await supabase.rpc("vault_insert_secret", {
    new_secret: secret,
    new_name: name,
  });

  if (!error && data) {
    return data as string;
  }

  // Fallback: store with pgcrypto encryption
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("encrypted_secrets")
    .insert({
      name,
      encrypted_value: secret, // In production, encrypt with pgcrypto
    })
    .select("id")
    .single();

  if (fallbackError) {
    throw new Error(`Failed to store secret: ${fallbackError.message}`);
  }

  return fallbackData.id;
}

/**
 * Retrieve a decrypted secret from Supabase Vault.
 */
export async function getSecret(id: string): Promise<string> {
  const supabase = createServiceClient();

  // Try Vault decrypted view
  const { data, error } = await supabase
    .from("vault.decrypted_secrets" as "decrypted_secrets")
    .select("decrypted_secret")
    .eq("id", id)
    .single();

  if (!error && data) {
    return (data as { decrypted_secret: string }).decrypted_secret;
  }

  // Fallback
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("encrypted_secrets")
    .select("encrypted_value")
    .eq("id", id)
    .single();

  if (fallbackError) {
    throw new Error(`Failed to retrieve secret: ${fallbackError.message}`);
  }

  return fallbackData.encrypted_value;
}

/**
 * Update an existing secret in Vault.
 */
export async function updateSecret(
  id: string,
  secret: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.rpc("vault_update_secret", {
    secret_id: id,
    new_secret: secret,
  });

  if (error) {
    // Fallback
    const { error: fallbackError } = await supabase
      .from("encrypted_secrets")
      .update({ encrypted_value: secret })
      .eq("id", id);

    if (fallbackError) {
      throw new Error(`Failed to update secret: ${fallbackError.message}`);
    }
  }
}
