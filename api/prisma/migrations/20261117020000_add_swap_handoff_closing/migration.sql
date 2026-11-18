-- AlterTable
ALTER TABLE "swap_routes" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "problemReason" VARCHAR(500),
ADD COLUMN     "problemReportedAt" TIMESTAMP(3),
ADD COLUMN     "problemReportedById" TEXT;

