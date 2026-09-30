# Do not add files here by hand

This directory is generated exclusively by `scripts/generate-migration.mjs`,
run locally against our own database. See `docs/rules/migrations.md` for the
full workflow. (Other repos in the org use a different, Supabase-CLI based
migration workflow, which doesn't apply to this repo.)

Short version: edit `prisma/schema/*.prisma`, replay the committed migrations
with `pnpm exec prisma migrate deploy`, then run
`node scripts/generate-migration.mjs --name <name> --db-url <url>` to write the
missing migration and apply it. If you ever find yourself about to hand-write
a file in this folder, stop: that's the one thing this workflow exists to
prevent.

One-off SQL that isn't a schema change (a data fix, reference rows, a view,
an extension) goes in `prisma/run-once.sql`, not here. `pnpm db:run-once`
applies it once per database and a ledger keeps it from running again. Same
doc, "Run-once SQL".
