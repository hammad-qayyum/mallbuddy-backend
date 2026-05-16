-- AlterTable
-- Add a Postgres text array for multi-select cuisines on Restaurant.
-- Default to empty array so existing rows remain valid without backfill.
ALTER TABLE "Restaurant"
ADD COLUMN "cuisines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
