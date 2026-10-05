# API and service setup guide

How to create and configure every external API and service this project uses, and exactly which value goes on which line of `.env.local` (ROADMAP Rule-10). Add a section here in the same step that adds a new service.

Never paste a key, password or connection string into a Claude Code chat: `.claude-logs/` commits every prompt to git. Type the values straight into `.env.local`, which git ignores.

## 0. How to fill `.env.local`

`.env.local` sits at the repo root (Step-5 created it as a copy of `.env.example`). Each setting is one line, `NAME="value"`. "Put X on the `NAME` line" means: paste X between the two double quotes of that line, replacing whatever is there. For example, the `NEXT_PUBLIC_SUPABASE_URL=""` line becomes `NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"`.

Every value in this guide's examples is made up; yours will differ. Lines this guide says to leave empty stay as `NAME=""`.

The full list of lines to fill, and where each value comes from:

| `.env.local` line                      | Value                                                                        | Where you get it    |
| -------------------------------------- | ---------------------------------------------------------------------------- | ------------------- |
| `DATABASE_URL`                         | Session pooler string, port `5432` changed to `6543`, plus `?pgbouncer=true` | Supabase, step 1.8  |
| `DIRECT_URL`                           | Session pooler string with your password                                     | Supabase, step 1.7  |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://<project-ref>.supabase.co`                                          | Supabase, step 1.9  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key, `sb_publishable_...`                                        | Supabase, step 1.10 |
| `SUPABASE_SECRET_KEY`                  | Secret key, `sb_secret_...` (needed by Delete my account)                    | Supabase, step 1.11 |
| `NEXT_PUBLIC_SENTRY_DSN`               | DSN, `https://...ingest...sentry.io/...`                                     | Sentry, step 2.3    |
| `SENTRY_ORG`                           | Organization slug                                                            | Sentry, step 2.4    |
| `SENTRY_PROJECT`                       | `jevs-playground`                                                            | Sentry, step 2.5    |
| `SENTRY_AUTH_TOKEN`                    | Leave empty                                                                  | -                   |
| `NEXT_PUBLIC_POSTHOG_KEY`              | Project API key, `phc_...`                                                   | PostHog, step 3.3   |
| `NEXT_PUBLIC_POSTHOG_HOST`             | Already `https://us.i.posthog.com`; leave it                                 | -                   |
| `LOG_LEVEL`                            | Leave empty (means `info`)                                                   | -                   |
| `NEXT_PUBLIC_APP_URL`                  | Already `http://localhost:3000`; leave it                                    | -                   |
| `NEXT_PUBLIC_APP_VERSION`              | Leave empty                                                                  | -                   |

## 1. Supabase (Postgres and Auth)

Free plan. One project for development now; a second one for production at the Vercel launch (TECH-STACK > Database).

### Create and configure the project

1. Sign in at https://supabase.com/dashboard and click **New project**.
2. Fill in the form:
   - **Project name:** `jevs-playground-dev`.
   - **Database password:** click **Generate a password** (letters and digits only, so it needs no encoding later) and save it in a password manager now. You need it in step 6, and Supabase never shows it again.
   - **Region:** **South Asia (Mumbai)** (`ap-south-1`), the closest to the owner. If the picker shows only broad areas, choose **Asia-Pacific**, or pick Mumbai under its specific-region option.
   - **Enable automatic RLS:** leave it unticked. Our tables still get RLS: each table's own migration turns it on, and `pnpm check:rls` proves it. The trigger would hide a migration that forgot its `ENABLE ROW LEVEL SECURITY` line, and that table would then be unlocked on any database created without the trigger (CI, production).
   - Click **Create new project** and wait until provisioning finishes.
3. Turn off the Data API. All app data goes through Prisma, so PostgREST must not expose any table (`docs/rules/auth.md`). Open **Integrations > Data API** in the left sidebar and switch **Enable Data API** off.
4. Use asymmetric JWT signing keys, so `getClaims()` in `src/proxy.ts` checks the session locally instead of calling Supabase on every request. Open **Project Settings > JWT Keys**.
   - If the current key is already an asymmetric key (ECC P-256 or RSA), there is nothing to do.
   - If it shows the legacy JWT secret, click **Migrate JWT secret**, then **Rotate keys**, so the new asymmetric key signs new sessions.
5. Email sign-in without confirmation (TECH-STACK > Auth): open **Authentication > Sign In / Providers**. Keep **Allow new users to sign up** on and the **Email** provider enabled, turn **Confirm email** off, and click **Save**.

### Secure the database connection

Without this, the database password crosses the internet in plain text. RLS doesn't help there: it limits which rows a role can read, after the connection is made.

- Open **Project Settings > Database > SSL Configuration**.
- Click **Download certificate**. You get a file like `prod-ca-2021.crt`, Supabase's public CA certificate. It is not a secret.
- Move it, keeping its name, to `prisma/prod-ca-2021.crt` in the repo. The app, the scripts and the Prisma CLI read it from there, to check that they are really talking to Supabase.
- Switch **Enforce SSL on incoming connections** on, so the database refuses any unencrypted connection.

### Copy the database URLs

You copy **one** string from Supabase, the **Session pooler** string, and use it for both database lines. Only the port differs:

- `DIRECT_URL` uses it as is (port `5432`). Migrations need this mode.
- `DATABASE_URL` uses it with port `6543` and `?pgbouncer=true` at the end. On the same host, port 6543 is the pooler's transaction mode, which the running app uses.

Don't use the **Direct connection** or **Transaction pooler** entries in the dialog, and don't enable the paid **IPv4 add-on**. The dialog marks those entries as IPv6, which many home networks can't reach. The Session pooler is IPv4, and so is its host on port 6543.

6. **Copy the Session pooler string:**
   1. On the project page, click **Connect** in the top bar. The "Connect to your project" dialog opens.
   2. Open the **Connection String** tab. Leave **Type** on `URI` and **Source** on `Primary database`. Set **Method** to **Session pooler**.
   3. Copy the string. It looks like this (made-up ref and region):
      `postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`
   4. Replace `[YOUR-PASSWORD]`, brackets included, with your database password. If the password has characters other than letters and digits, encode each one: `@` as `%40`, `#` as `%23`, `/` as `%2F`, `:` as `%3A`, `?` as `%3F`, `&` as `%26`, `%` as `%25`. Lost the password? **Project Settings > Database > Reset database password**, then use **Generate a password**.
7. **`DIRECT_URL`:** paste the string from step 6 between the quotes on the `DIRECT_URL` line, unchanged. In the results below, `<your-db-password>` stands for your real password, typed without the `<` `>`.
   Result: `DIRECT_URL="postgresql://postgres.abcdefghijklmnop:<your-db-password>@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"`
8. **`DATABASE_URL`:** paste the same string between the quotes on the `DATABASE_URL` line, then make two edits in that line only:
   1. Change `:5432/` to `:6543/`.
   2. Add `?pgbouncer=true` at the very end, inside the quotes.
      Result: `DATABASE_URL="postgresql://postgres.abcdefghijklmnop:<your-db-password>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"`

### Copy the project URL and the publishable key

9. **`NEXT_PUBLIC_SUPABASE_URL`:** your project ref is the 20-letter ID in the dashboard address bar (`supabase.com/dashboard/project/<project-ref>`), also shown at **Project Settings > General > Project ID**. Put `https://<project-ref>.supabase.co` on the `NEXT_PUBLIC_SUPABASE_URL` line.
   Result: `NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"`
10. **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:** open **Project Settings** (the gear at the bottom of the left sidebar) **> API Keys**, on the **Publishable and secret API keys** tab. If no publishable key is listed, click **Create new API keys**. Copy the **Publishable key** (it starts with `sb_publishable_`) and put it on the `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` line. Don't use the keys on the **Legacy API keys** tab (`anon`, `service_role`); Supabase is retiring them.
    Result: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_AbCdEf123..."`
11. **`SUPABASE_SECRET_KEY`:** on the same **Publishable and secret API keys** tab, copy the **Secret** key (`sb_secret_...`, click the eye or copy icon on the `default` secret key). Put it on the `SUPABASE_SECRET_KEY` line. The app uses it for one thing: removing your Supabase sign-in when you press **Delete my account** on Profile (the profile page's delete only works with it set). It is server-only and bypasses all access rules, so never prefix it with `NEXT_PUBLIC_`, never paste it into the browser, and on Vercel add it as a normal (not public) environment variable.
    Result: `SUPABASE_SECRET_KEY="sb_secret_AbCdEf123..."`

Check the database lines before moving on:

- `DATABASE_URL` has `:6543` and ends with `?pgbouncer=true`.
- `DIRECT_URL` has `:5432` and no `?pgbouncer=true`.
- Neither still contains `[YOUR-PASSWORD]` or the brackets.
- The user name before the `:` is `postgres.<project-ref>` (with the dot and the ref), not just `postgres`.

Don't create tables or users in the SQL editor. Migrations create every table (`docs/rules/migrations.md`).

### Production project (Step-28)

The deployed app uses its own free Supabase project, `jevs-playground-prod`, so the dev project's test users and data never mix with real players. Its values live in `.env.prod-values.local` (gitignored, like every `.env*.local`), never in `.env.local`, and from Step-29 on in Vercel's environment variables. **Do not name that file `.env.production.local`**: Next.js loads that name automatically for `next build` and `next start`, so every local production build and server would silently use the production database (this happened once, see `docs/progress.md` Step-30).

1. Create it as in "Create and configure the project" above, with these differences: name `jevs-playground-prod`; region **East US (North Virginia)** (`us-east-1`), the closest to Vercel's default function region `iad1` and to most of the audience, so a page's database round trip stays short; on the form, untick **Enable Data API** (and leave **Enable automatic RLS** unticked), like the dev project. The free plan allows two projects per organization, and this uses the second.
2. Use **Generate a password** for the database password and copy it at once: Supabase never shows it again, and a lost one is replaced from **Database > Settings > Reset database password**. Keep it only in `.env.prod-values.local`, never in a chat, ticket or commit.
3. Connection strings: **Connect > Direct**, then the **Session pooler** (port 5432) for `DIRECT_URL` and the **Transaction pooler** (port 6543, `?pgbouncer=true`) for `DATABASE_URL`, built exactly as steps 7 and 8 above. The production host is `aws-0-us-east-1.pooler.supabase.com`, and the user is `postgres.<project-ref>`.
4. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` from the production project as in steps 9 to 11.
5. Apply the schema to production only from this machine, with the production values for that command alone (they override `.env.local`: a variable already set wins, see `prisma.config.ts`): load `.env.prod-values.local` into the shell, then run `pnpm exec prisma migrate deploy`, `pnpm db:run-once` and `pnpm check:rls`. Expect 13 migrations applied (all of them at the time of Step-28), "nothing to run" for the run-once file, and "RLS enabled with no policies on all 10 table(s)". The CLI and the scripts verify TLS against the same Supabase CA as the app. Never run `prisma migrate dev` or `reset` against it.
6. **Authentication > Sign In / Providers > Confirm email must be off**, as on the dev project: without a custom domain there is no email sender of our own, Supabase's built-in sender allows only a few emails an hour, and the app expects a session right after sign-up. New projects start with it on, so switch it off and press **Save changes**. Step-19's rate limits guard sign-ups instead.
7. In Step-29, add the Vercel URL to **Authentication > URL Configuration** (Site URL and Redirect URLs).

## 2. Sentry (error tracking)

Free Developer plan.

1. Sign up at https://sentry.io. Choose the **US** data region if asked, and create an organization.
2. Open **Projects > Create Project**. Platform: **Next.js**. Alert frequency: **Alert me on every new issue**. Project name: `jevs-playground`. Click **Create Project**, then skip the setup wizard; the SDK is already set up in this repo.
3. **`NEXT_PUBLIC_SENTRY_DSN`:** open **Settings > Projects > jevs-playground**, then under **SDK Setup** click **Client Keys (DSN)**. Copy the value labelled **DSN** and put it on the `NEXT_PUBLIC_SENTRY_DSN` line. It starts with `https://`, contains `@o<numbers>.ingest`, and ends in `/<numbers>`. The **Security Token** setting elsewhere in Sentry is something else; ignore it.
   Result: `NEXT_PUBLIC_SENTRY_DSN="https://abc123def456@o1234567.ingest.us.sentry.io/7654321"`
4. **`SENTRY_ORG`:** your organization slug: the part before `.sentry.io` in the address bar, also at **Settings > Organization > General > Organization Slug**. Put it on the `SENTRY_ORG` line.
   Result: `SENTRY_ORG="my-org"`
5. **`SENTRY_PROJECT`:** put the project slug on the `SENTRY_PROJECT` line.
   Result: `SENTRY_PROJECT="jevs-playground"`
6. **`SENTRY_AUTH_TOKEN`:** leave it as `SENTRY_AUTH_TOKEN=""`. It only uploads source maps at build time; set it at the Vercel launch (**Settings > Auth Tokens**).
7. Recommended: open **Settings > Projects > jevs-playground > Security & Privacy** and keep **Data Scrubber** and **Use Default Scrubbers** on. The app already strips key headers before sending (DESIGN 12); this is a second layer.

## 3. PostHog (product analytics)

Free plan, US Cloud.

1. Sign up at https://us.posthog.com/signup and choose **US Cloud**. Create an organization. PostHog creates a first project called **Default project**; that one is fine, or rename it to `jevs-playground` in **Settings > Project**. Events show up in whichever project the key in step 3 comes from, so check the project selector at the top-left when looking for them.
2. Skip the install wizard; the SDK is already set up in this repo.
3. **`NEXT_PUBLIC_POSTHOG_KEY`:** open **Settings** (left sidebar) **> Project > General** and copy the **Project API key** (it starts with `phc_`). Put it on the `NEXT_PUBLIC_POSTHOG_KEY` line. It is a public, write-only key, safe in the browser.
   Result: `NEXT_PUBLIC_POSTHOG_KEY="phc_AbCdEf123..."`
4. **`NEXT_PUBLIC_POSTHOG_HOST`:** leave the line as `NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"`.
5. Session replay: in **Settings > Project > Session replay**, if you turn replay on, keep **Mask all inputs** on. The app also masks every input and skips fields marked `ph-no-capture` (DESIGN 12).

## 4. Recording keys (owner only)

These two keys are for the recording CLI (`corepack pnpm record`) and nothing else. The app never reads them, and they never go to Vercel.

1. **`TYPESAFE_API_KEY`:** create it in the TypeSafe dashboard, as described at docs.typesafe.ai. It lets the CLI call Jev.
2. **`ANTHROPIC_API_KEY`:** create it at https://platform.claude.com/settings/keys. It lets the CLI call Claude Opus 5.5, Sonnet 5.5 and Haiku 4.5.
3. Paste them into `.env.local` as `TYPESAFE_API_KEY` and `ANTHROPIC_API_KEY`.
4. Run `corepack pnpm record --dry-run` first. It prints the estimated cost and spends nothing.
5. When recording is done, delete both values from `.env.local` (spec R22).

Never paste a key into a chat: `.claude-logs/` commits every prompt.

## 5. Check the setup

Run these from the repo root:

1. `corepack pnpm check:env`: every variable is documented.
2. `corepack pnpm dev`, then open http://localhost:3000. It boots without an "Invalid environment variables" error.
3. `corepack pnpm check:rls`: connects over verified TLS and prints "RLS enabled with no policies".
4. Sentry and PostHog are dashboards on their own sites, not pages in our app. After opening http://localhost:3000, PostHog's **Activity** page (us.posthog.com, the project the key belongs to) lists `$pageview` and `app_opened` from `localhost:3000` within a minute or two. Sentry's **Issues** page (sentry.io) lists an error only after the app actually crashes.

## 6. Vercel (hosting, Step-29)

The app is hosted on Vercel's free plan at its `vercel.app` address; no custom domain is bought. The Vercel project is `ahmar9/jev-playground`.

1. Sign in at https://vercel.com with GitHub, **Add New > Project**, import `Ahmar004/jev-playground` and accept the Next.js defaults (pnpm is detected from `pnpm-lock.yaml`; `vercel.json` pins the function region to `iad1`, Washington DC, next to the `us-east-1` production database).
2. **Settings > Environment Variables**, scope **Production** (and Preview if you want preview deploys to work). Paste each value from `.env.prod-values.local`; mark the secret ones **Sensitive**. Never paste a key into a chat.

   | Variable                                                                        | Value                                                                               | Secret?     |
   | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------- |
   | `DATABASE_URL`                                                                  | production transaction pooler string (port 6543, `?pgbouncer=true`)                 | yes         |
   | `NEXT_PUBLIC_SUPABASE_URL`                                                      | `https://<prod-ref>.supabase.co`                                                    | no (public) |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                                          | production publishable key                                                          | no (public) |
   | `SUPABASE_SECRET_KEY`                                                           | production secret key (used only by Delete my account)                              | yes         |
   | `NEXT_PUBLIC_APP_URL`                                                           | the deployment's own address, for example `https://jev-playground.vercel.app`       | no          |
   | `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | from the Sentry and PostHog projects production should report to (sections 2 and 3) | no (public) |
   | `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`                             | optional: only for uploading source maps at build time                              | token: yes  |

   Do not add `DIRECT_URL`, `PROD_DB_PASSWORD`, `TYPESAFE_API_KEY` or `ANTHROPIC_API_KEY`: migrations run from your PC, and the recording keys are for the local CLI only (section 4). `NEXT_PUBLIC_*` values are baked into the build, so change one and redeploy.

3. Press **Deploy**. Every push to `main` then deploys to production; check that the build is green in the Deployments tab.
4. In the production Supabase project, **Authentication > URL Configuration**: set **Site URL** to the deployment address and add `https://<address>/**` to **Redirect URLs**.
5. Open the address and sign up with a throwaway email. A new account must land on Home straight away (that is what **Confirm email off** in section 1 is for).
