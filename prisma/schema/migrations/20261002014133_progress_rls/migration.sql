-- Hand-written, the sanctioned exception in docs/rules/migrations.md: the
-- Prisma schema can't express RLS. Enabled with no policies (deny-by-default
-- for the anon and authenticated roles), never FORCEd, so Prisma, which
-- connects as the table owner, is unaffected. See docs/rules/auth.md.
ALTER TABLE "level_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "check_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "xp_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_badges" ENABLE ROW LEVEL SECURITY;
