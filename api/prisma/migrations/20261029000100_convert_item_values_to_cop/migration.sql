-- SmartSwap is now Colombia-only and prices items in Colombian pesos (COP).
-- Existing values were entered in USD: convert them once at a rounded 4,000 COP per USD,
-- rounded to the nearest 1,000 pesos. Prisma runs each migration exactly once.
UPDATE "items"
SET "estimatedValue" = ROUND("estimatedValue" * 4000 / 1000) * 1000
WHERE "estimatedValue" IS NOT NULL;

UPDATE "wants"
SET "minValue" = ROUND("minValue" * 4000 / 1000) * 1000
WHERE "minValue" IS NOT NULL;

UPDATE "wants"
SET "maxValue" = ROUND("maxValue" * 4000 / 1000) * 1000
WHERE "maxValue" IS NOT NULL;
