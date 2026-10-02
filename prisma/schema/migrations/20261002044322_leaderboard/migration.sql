-- CreateTable
CREATE TABLE "leaderboard_entries" (
    "user_id" UUID NOT NULL,
    "game_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "wall_ms" INTEGER NOT NULL,
    "cost_usd" DOUBLE PRECISION,
    "runs" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("user_id","game_id","model_id","mode")
);

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
