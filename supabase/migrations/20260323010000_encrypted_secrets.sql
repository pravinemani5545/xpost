-- Fallback encrypted secrets table (when Vault is not available)
CREATE TABLE encrypted_secrets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER encrypted_secrets_updated_at
  BEFORE UPDATE ON encrypted_secrets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- No RLS — only accessed via service role key
ALTER TABLE encrypted_secrets ENABLE ROW LEVEL SECURITY;
