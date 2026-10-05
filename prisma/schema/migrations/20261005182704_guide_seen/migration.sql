-- AlterTable
ALTER TABLE "users" ADD COLUMN     "guide_seen" TEXT[] DEFAULT ARRAY[]::TEXT[];
