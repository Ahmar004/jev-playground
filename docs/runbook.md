# Runbook

What to do when something on the live site (https://letsplaywithjev.vercel.app) needs the owner. Setup steps for each service are in `docs/api-setup-guide.md`.

## The site is down or every page errors

1. Vercel dashboard > project `jev-playground` > Deployments. If the newest deployment is red or just went out, open the previous green one and choose **Instant Rollback**. A rollback is immediate and needs no rebuild.
2. If no deploy changed anything, check Supabase next (below), then Sentry (https://resorvoir.sentry.io, project `jevs-playground-prod`) for the error that repeats.

## The Supabase project is paused

Free projects are paused after 7 days with little database activity. A paused database makes every signed-in page and every sign-in fail. Real traffic keeps the project awake, so this matters only before launch or in a quiet week.

- Restore: Supabase dashboard > project `jevs-playground-prod` > **Restore project** (one click, a few minutes). Nothing is lost.
- A project can be restored only for 90 days after the pause. After that the dashboard offers only a backup download.
- Prevention: open the app signed in at least once a week until launch.

## Rotating a key

Do the new value first, then redeploy, then revoke the old one, so there is no gap. Never paste a key into a chat (`.claude-logs/` commits every prompt).

| Secret                                                              | Where it is set                     | How to rotate                                                                                                                                                 |
| ------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database password (inside `DATABASE_URL` and `DIRECT_URL`)          | Vercel, `.env.prod-values.local`    | Supabase > Database > Settings > Reset database password. Update `DATABASE_URL` in Vercel and in `.env.prod-values.local`, then redeploy.                     |
| `SUPABASE_SECRET_KEY`                                               | Vercel, `.env.prod-values.local`    | Supabase > Project Settings > API Keys: create a new secret key, update Vercel, redeploy, then delete the old key. Only Delete my account uses it.            |
| `SENTRY_AUTH_TOKEN` (if set)                                        | Vercel                              | Sentry > Settings > Auth Tokens: create a new one, update Vercel, revoke the old one. It only uploads source maps.                                            |
| `NEXT_PUBLIC_*` (Supabase publishable key, Sentry DSN, PostHog key) | Vercel                              | Public by design, so rotate only if abused (a flood of fake events). Change it in the service, update Vercel and redeploy: the value is baked into the build. |
| `TYPESAFE_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`       | `.env.local` on the owner's PC only | Create a new key in the provider's dashboard, update `.env.local`, delete the old one. They are never on Vercel, so no redeploy.                              |

A visitor's own provider keys live only in their browser tab, so there is nothing of theirs to rotate.

## The Anthropic credit runs low

The live site never spends the owner's credit: the owner keys are not on Vercel, and Developer mode uses each visitor's own keys. Only `corepack pnpm record` spends it (ROADMAP Rule-0.1).

- Check the balance at https://platform.claude.com/settings/billing. The top of `ROADMAP.md` holds the last known figure.
- Run `corepack pnpm record --dry-run` before any recording; it prints the estimate and spends nothing. Record only the tasks whose content changed.
- If the balance is too low to record, do not record. Beginner mode keeps working, because it replays the JSON files under `content/`.

## Where alerts go

- **Sentry:** the project has the alert "Send a notification for high priority issues". It emails the owner when a new high-priority error appears in `jevs-playground-prod`. Open the issue, check the stack trace, and roll back (first section) if it started with a deploy.
- **PostHog:** the funnel "Beginner activation (production)" (app_opened, level_started, prediction_made, level_completed, filtered to the production host) shows where visitors drop off in their first level. PostHog does not email about it; open it after a Discord post.
- **Vercel:** usage is under Settings > Usage. The free plan allows 4 hours of Active CPU and 1,000,000 function invocations a month; check it after a Discord post.

## Known behaviours, not faults

- A tab opened before a deploy shows "Could not reach the server" on its next sign-in or form, because it holds the old build's Server Action id. A reload fixes it. Deploy when few people are online.
- There is no password reset: it needs an email sender of our own, and no domain is bought.
- Promotional model prices end on 2026-11-21 (gpt-5.6-sol) and 2026-12-31 (gemini flash models); after that those models show "price unknown" until `content/prices.json` is rechecked.
