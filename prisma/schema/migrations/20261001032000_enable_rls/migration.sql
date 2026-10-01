-- Hand-written, the sanctioned exception in docs/rules/migrations.md: the
-- Prisma schema can't express RLS. Enabled with no policies (deny-by-default
-- for the anon and authenticated roles), never FORCEd, so Prisma, which
-- connects as the table owner, is unaffected. See docs/rules/auth.md.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_run_once_sql" ENABLE ROW LEVEL SECURITY;
