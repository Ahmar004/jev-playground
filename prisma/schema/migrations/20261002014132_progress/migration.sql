-- CreateTable
CREATE TABLE "level_progress" (
    "user_id" UUID NOT NULL,
    "level_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "prediction" JSONB,
    "opponent_model_id" TEXT,
    "prediction_correct" BOOLEAN,
    "revealed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_progress_pkey" PRIMARY KEY ("user_id","level_id")
);

-- CreateTable
CREATE TABLE "check_answers" (
    "user_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_answers_pkey" PRIMARY KEY ("user_id","question_id")
);

-- CreateTable
CREATE TABLE "xp_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "user_id" UUID NOT NULL,
    "badge_id" TEXT NOT NULL,
    "earned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id","badge_id")
);

-- CreateIndex
CREATE INDEX "check_answers_user_id_level_id_idx" ON "check_answers"("user_id", "level_id");

-- CreateIndex
CREATE UNIQUE INDEX "xp_events_user_id_source_source_id_key" ON "xp_events"("user_id", "source", "source_id");

-- AddForeignKey
ALTER TABLE "level_progress" ADD CONSTRAINT "level_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_answers" ADD CONSTRAINT "check_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
