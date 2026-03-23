-- TweetQueue: Initial Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tweet status enum
CREATE TYPE tweet_status AS ENUM ('scheduled', 'posted', 'failed');

-- Time slot enum
CREATE TYPE time_slot AS ENUM ('9AM', '12PM', '3PM', '6PM', '9PM', 'custom');

-- Tweets table
CREATE TABLE tweets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (char_length(content) <= 280),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  time_slot     time_slot NOT NULL DEFAULT 'custom',
  category      TEXT,
  status        tweet_status NOT NULL DEFAULT 'scheduled',
  posted_at     TIMESTAMPTZ,
  error_message TEXT,
  x_tweet_id    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: same user cannot have two tweets at identical scheduled_at
CREATE UNIQUE INDEX tweets_user_scheduled_at_unique
  ON tweets (user_id, scheduled_at)
  WHERE status = 'scheduled';

-- Deduplication: posted tweet IDs must be unique per user
CREATE UNIQUE INDEX tweets_user_x_tweet_id_unique
  ON tweets (user_id, x_tweet_id)
  WHERE x_tweet_id IS NOT NULL;

-- Index for cron query performance
CREATE INDEX tweets_status_scheduled_at_idx
  ON tweets (status, scheduled_at)
  WHERE status = 'scheduled';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tweets_updated_at
  BEFORE UPDATE ON tweets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- X OAuth connections table (one per user)
CREATE TABLE x_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  x_user_id         TEXT NOT NULL,
  x_username        TEXT NOT NULL,
  x_display_name    TEXT,
  access_token_id   UUID,
  refresh_token_id  UUID,
  token_expires_at  TIMESTAMPTZ,
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER x_connections_updated_at
  BEFORE UPDATE ON x_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- AI generation rate limit tracking
CREATE TABLE ai_generation_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_generation_log_user_created_idx
  ON ai_generation_log (user_id, created_at);

-- OAuth state storage (for PKCE flow)
CREATE TABLE oauth_states (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state           TEXT NOT NULL UNIQUE,
  code_verifier   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clean up expired OAuth states (older than 10 minutes)
CREATE INDEX oauth_states_created_at_idx ON oauth_states (created_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Tweets: full CRUD for own rows only
CREATE POLICY "tweets_select_own" ON tweets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tweets_insert_own" ON tweets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tweets_update_own" ON tweets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tweets_delete_own" ON tweets
  FOR DELETE USING (auth.uid() = user_id);

-- X connections: own row only
CREATE POLICY "x_connections_select_own" ON x_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "x_connections_insert_own" ON x_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "x_connections_update_own" ON x_connections
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "x_connections_delete_own" ON x_connections
  FOR DELETE USING (auth.uid() = user_id);

-- AI log: own rows only
CREATE POLICY "ai_log_select_own" ON ai_generation_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_log_insert_own" ON ai_generation_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- OAuth states: own rows only
CREATE POLICY "oauth_states_select_own" ON oauth_states
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "oauth_states_insert_own" ON oauth_states
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "oauth_states_delete_own" ON oauth_states
  FOR DELETE USING (auth.uid() = user_id);

-- NOTE: Cron route handler uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- It must validate CRON_SECRET before any DB operation.
