-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'PENDING_SWAP', 'SWAPPED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('SUGGESTED', 'ACTIVE', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StepAcceptance" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "location" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "tradesCompleted" INTEGER NOT NULL DEFAULT 0,
    "co2SavedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD',
    "description" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "location" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "images" TEXT[],
    "aiTags" TEXT[],
    "embedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT,
    "queryText" TEXT NOT NULL,
    "category" TEXT,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "embedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap_routes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "objectiveText" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'SUGGESTED',
    "aiExplanation" TEXT,
    "co2SavedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swap_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap_route_steps" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "givesItemId" TEXT NOT NULL,
    "receivesItemId" TEXT NOT NULL,
    "acceptance" "StepAcceptance" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "deliveryConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swap_route_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "routeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "items_ownerId_idx" ON "items"("ownerId");

-- CreateIndex
CREATE INDEX "wants_userId_idx" ON "wants"("userId");

-- CreateIndex
CREATE INDEX "wants_itemId_idx" ON "wants"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "swap_routes_code_key" ON "swap_routes"("code");

-- CreateIndex
CREATE INDEX "swap_routes_initiatorId_idx" ON "swap_routes"("initiatorId");

-- CreateIndex
CREATE INDEX "swap_route_steps_userId_idx" ON "swap_route_steps"("userId");

-- CreateIndex
CREATE INDEX "swap_route_steps_givesItemId_idx" ON "swap_route_steps"("givesItemId");

-- CreateIndex
CREATE INDEX "swap_route_steps_receivesItemId_idx" ON "swap_route_steps"("receivesItemId");

-- CreateIndex
CREATE UNIQUE INDEX "swap_route_steps_routeId_stepOrder_key" ON "swap_route_steps"("routeId", "stepOrder");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wants" ADD CONSTRAINT "wants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wants" ADD CONSTRAINT "wants_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_routes" ADD CONSTRAINT "swap_routes_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_route_steps" ADD CONSTRAINT "swap_route_steps_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "swap_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_route_steps" ADD CONSTRAINT "swap_route_steps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_route_steps" ADD CONSTRAINT "swap_route_steps_givesItemId_fkey" FOREIGN KEY ("givesItemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_route_steps" ADD CONSTRAINT "swap_route_steps_receivesItemId_fkey" FOREIGN KEY ("receivesItemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "swap_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
