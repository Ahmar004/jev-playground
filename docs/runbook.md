# Runbook

What to do when something on the live site (https://letsplaywithjev.vercel.app) needs the owner. Setup steps for each service are in `docs/api-setup-guide.md`.

## Launch checklist (before a Discord post)

The site runs on Vercel Hobby (free) and Supabase Free. A launch spike is what can push either past its limit, so check them around every post.

1. The day before: open the live site signed in, play one level, and confirm the Supabase project `jevs-playground-prod` shows as active (not paused) and the newest Vercel deployment is green.
2. Don't deploy for an hour before and after the post. A deploy makes every tab that was already open show "The site was just updated. Reload to continue." on its next save (Hobby has no Skew Protection).
3. During the first hours, every 30 minutes: Vercel > Settings > Usage (Function Invocations, Active CPU, Fast Origin Transfer, CDN Requests), Supabase > Reports (database CPU and pooler client connections), and Sentry for new issues.
4. If any Vercel meter passes about 70% of its monthly allowance, decide on Pro before it reaches 100%, because Hobby pauses the site at the limit (next section). Pro costs $20 a month, paid from the project budget at the top of `ROADMAP.md`, so it is the owner's call.
5. If traffic looks like abuse rather than visitors (one IP or path hammering the site), turn on Vercel Firewall > **Attack Mode**; Hobby has it, and DDoS mitigation is on by default.

The Hobby allowances per month: 1,000,000 function invocations, 1,000,000 CDN requests, 4 hours of Active CPU, 10 GB Fast Origin Transfer and 100 GB Fast Data Transfer (https://vercel.com/docs/plans/hobby, checked 2026-10-06). A page view costs one function call; router prefetches skip the proxy (`src/proxy.ts`), so they cost none.

## If Vercel pauses the site

Visitors see Vercel's "503 DEPLOYMENT_PAUSED" page instead of the app. Hobby pauses a project that passes a usage limit, and it stays paused for 30 days unless the plan changes.

1. Vercel dashboard > Settings > Billing > **Upgrade** to Pro (card needed; the owner decides this).
2. Open the project `jev-playground`; a paused project never resumes by itself, so choose **Resume** on the project overview.
3. Load the live site and sign in to confirm it is back. Nothing in the database is lost by a pause.

Without an upgrade, the only way back is to wait until 30 days have passed.

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

| Secret                                                              | Where it is set                     | How to rotate                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database password (inside `DATABASE_URL` and `DIRECT_URL`)          | Vercel, `.env.prod-values.local`    | Supabase > Database > Settings > Reset database password. Update `DATABASE_URL` in Vercel and in `.env.prod-values.local`, then redeploy.                                                                                                                                                   |
| `SUPABASE_SECRET_KEY`                                               | Vercel, `.env.prod-values.local`    | Supabase > Project Settings > API Keys: create a new secret key, update Vercel, redeploy, then delete the old key. Delete my account and every sign-in, sign-up and session refresh use it (Step-45), so keep this order: a deleted key that Vercel still uses breaks sign-in for everyone. |
| `SENTRY_AUTH_TOKEN` (if set)                                        | Vercel                              | Sentry > Settings > Auth Tokens: create a new one, update Vercel, revoke the old one. It only uploads source maps.                                                                                                                                                                          |
| `NEXT_PUBLIC_*` (Supabase publishable key, Sentry DSN, PostHog key) | Vercel                              | Public by design, so rotate only if abused (a flood of fake events). Change it in the service, update Vercel and redeploy: the value is baked into the build.                                                                                                                               |
| `TYPESAFE_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`       | `.env.local` on the owner's PC only | Create a new key in the provider's dashboard, update `.env.local`, delete the old one. They are never on Vercel, so no redeploy.                                                                                                                                                            |

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

- A tab opened before a deploy shows "The site was just updated. Reload to continue." with a Reload button on its next save, sign-in or form, because it holds the old build's Server Action ids (`src/lib/errors/stale-deploy.ts`). Navigating reloads on its own. Deploy when few people are online.
- There is no password reset: it needs an email sender of our own, and no domain is bought.
- Promotional model prices end on 2026-11-21 (gpt-5.6-sol) and 2026-12-31 (gemini flash models); after that those models show "price unknown" until `content/prices.json` is rechecked.
