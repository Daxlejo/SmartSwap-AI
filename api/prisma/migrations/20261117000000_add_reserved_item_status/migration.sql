-- Additive: items of a route every participant accepted are RESERVED until the handoff ends.
ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'RESERVED';
