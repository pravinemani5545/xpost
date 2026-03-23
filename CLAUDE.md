# TweetQueue — Claude Code Context

## What this app does
Self-hosted X (Twitter) tweet scheduler. Write tweets, schedule them to
9AM/12PM/3PM/6PM/9PM ET slots, Vercel Cron posts them automatically via
X API v2. Claude Haiku generates 3 variations from a topic prompt.
Full ownership — no Buffer, no Hypefury, no recurring SaaS cost.

## Stack
- Next.js 16 App Router + TypeScript strict
- Tailwind CSS v4 (CSS-first @theme)
- shadcn/ui (base-nova style, base-ui/react) + Sonner + lucide-react
- Supabase (Postgres + Auth via @supabase/ssr + Vault)
- Google Gemini (gemini-2.0-flash-lite) — tweet variation generation
- X API v2 (twitter-api-v2) — OAuth 2.0 PKCE + POST /2/tweets
- Vercel Cron Jobs — */15 * * * * posting schedule
- pnpm

## Dev commands
```
pnpm dev          # dev server
pnpm build        # production build
pnpm lint         # ESLint
pnpm type-check   # tsc --noEmit
```

Test cron locally:
```
curl -X POST http://localhost:3000/api/cron/post-tweets \
  -H "Authorization: Bearer <CRON_SECRET>"
```

## Key env vars
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY (server only)
GEMINI_API_KEY (server only)
X_CLIENT_ID, X_CLIENT_SECRET (server only)
CRON_SECRET (server only)
NEXT_PUBLIC_APP_URL

## Architecture patterns
- Server Components by default, Client Components only for interactivity
- Auth: createServerClient + getUser()
- proxy.ts for route protection (exceptions: /api/cron/*, /api/auth/x/*, /auth/callback)
- Lazy-initialize all external API clients (Gemini, TwitterApi)
- Structured Outputs (JSON schema) for all Gemini calls
- Cron route: CRON_SECRET header validated FIRST, then service role client
- X tokens: always encrypted via Vault — never plaintext in DB or logs
- Promise.allSettled for all parallel cron post operations

## Mistakes to avoid
- shadcn base-nova uses base-ui/react, NOT Radix — use `render` prop instead of `asChild`
- Select onValueChange passes `string | null`, not just `string` — handle null
- useSearchParams must be wrapped in Suspense boundary
- parsed_output from Anthropic SDK can be null — check before accessing
- @supabase/auth-helpers is deprecated — use @supabase/ssr
- Promise.all crashes on single failure — use Promise.allSettled in cron
- Module-level API client init causes build errors — use lazy functions
- proxy.ts replaces middleware.ts in Next.js 16 (Node.js runtime)
- await headers(), cookies(), params in Next.js 16
- Zod 4: .issues not .errors, { error: "..." } not { message: "..." }
