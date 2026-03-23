---
name: x-api
description: X API v2 patterns — OAuth 2.0 PKCE flow, posting, token refresh, rate limits
---

Key facts:
- Library: twitter-api-v2 (not twitter-api-v1)
- OAuth 2.0 PKCE only — no OAuth 1.0a
- POST /2/tweets for posting
- GET /2/users/me for account verification
- Scopes needed: tweet.read tweet.write users.read offline.access
- Free tier: 17 posts/24h — Basic: 100 posts/24h
- Token refresh: grant_type=refresh_token at https://api.twitter.com/2/oauth2/token
- Always check token_expires_at before posting, refresh if within 10 min
- Use `client.generateOAuth2AuthLink(redirectUri, { scope })` for auth links
- Use `client.loginWithOAuth2({ code, codeVerifier, redirectUri })` for token exchange
- Use `client.refreshOAuth2Token(refreshToken)` for refresh
- Use `client.v2.tweet(content)` for posting
- Use `client.v2.me()` for user info
