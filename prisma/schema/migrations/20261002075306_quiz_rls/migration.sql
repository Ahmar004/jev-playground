-- Hand-written, the sanctioned exception in docs/rules/migrations.md: the
-- Prisma schema can't express RLS. Enabled with no policies (deny-by-default
-- for the anon and authenticated roles), never FORCEd. See docs/rules/auth.md.
ALTER TABLE "quiz_attempts" ENABLE ROW LEVEL SECURITY;
