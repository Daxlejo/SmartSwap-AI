-- AlterTable
ALTER TABLE "swap_routes" ADD COLUMN     "meetingAt" TIMESTAMP(3),
ADD COLUMN     "meetingConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "meetingPlace" TEXT,
ADD COLUMN     "meetingProposedById" TEXT;

-- AlterTable
ALTER TABLE "swap_route_steps" ADD COLUMN     "meetingConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "swap_messages" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swap_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "swap_messages_routeId_createdAt_idx" ON "swap_messages"("routeId", "createdAt");

-- AddForeignKey
ALTER TABLE "swap_messages" ADD CONSTRAINT "swap_messages_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "swap_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_messages" ADD CONSTRAINT "swap_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

