-- AlterTable
ALTER TABLE "users" ADD COLUMN     "departmentCode" TEXT,
ADD COLUMN     "municipalityCode" TEXT;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "departmentCode" TEXT,
ADD COLUMN     "municipalityCode" TEXT;

-- CreateIndex
CREATE INDEX "items_municipalityCode_idx" ON "items"("municipalityCode");

-- CreateIndex
CREATE INDEX "items_departmentCode_idx" ON "items"("departmentCode");
