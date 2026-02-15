-- cloudPassword already added manually
-- empty migration to sync prisma history
ALTER TABLE "Session"
ADD COLUMN IF NOT EXISTS "cloudPassword" TEXT;
