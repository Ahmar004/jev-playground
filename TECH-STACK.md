# Proposed Tech Stack for "Jev's Playground"


### Please note: the project has to be local for now, hosted at localhost (no deployment on vercel needed (as access is restricted as the github repo is owned by 8x)

## Carried over from the 8x template (Step-0.2)

These come with the template and fit the spec. Step-1 confirms or replaces each one; none is final yet.

- **Framework:** Next.js 16 App Router, React 19, React Compiler (`panicThreshold: 'all_errors'`), Turbopack, TypeScript strict. pnpm, Node 22.18+.
- **UI:** Tailwind CSS v4 with semantic tokens in `src/app/globals.css`, `cva` + `cn()` for variants, Radix primitives (Slot, Label, Toast) in `src/components/ui/`, Phosphor icons imported only through `@/components/ui/icons`.
- **Data and auth (pending the Step-1 database choice):** Prisma 6 as the only data path. Supabase Auth for auth only, with the Data API off and RLS on every table with no policies (`pnpm check:rls`). Migrations are generated and applied locally.
- **Server contracts:** Zod for env (`src/lib/env.ts`) and for every route and action input (`createApiRoute`, `validatedAction`). `AppError` for user-caused failures.
- **Client server-state:** TanStack Query.
- **Observability:** Pino logger with redaction (server only), Sentry through `captureError`/`captureClientError`, PostHog through the typed event taxonomy (anonymous, R85). None of them ever sees an API key or user task text.
- **Testing:** `node:test` unit tests (`pnpm test`), Playwright e2e (`pnpm test:e2e`).
- **Gates (run locally; GitHub CI stays disabled):** lint, typecheck, format:check, check:env, check:secrets, check:standards, test and build, run through the `local-review` skill. Plus the commit-msg and pre-commit (secret scan) git hooks.
