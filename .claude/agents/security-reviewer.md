Review this file for security issues specific to TweetQueue:
1. Are X OAuth tokens stored encrypted (Vault), never plaintext?
2. Is CRON_SECRET validated as the FIRST operation in /api/cron/post-tweets?
3. Is X_CLIENT_SECRET referenced only in server-side files?
4. Is user_id derived from getUser() session, never from request body?
5. Are all tables (tweets, x_connections, ai_generation_log, oauth_states) RLS-enabled?
6. Is the AI endpoint rate-limited server-side before calling Claude?
7. Are Twitter clients lazy-initialized (not module-level)?
Report each issue with file path, line number, and fix recommendation.
