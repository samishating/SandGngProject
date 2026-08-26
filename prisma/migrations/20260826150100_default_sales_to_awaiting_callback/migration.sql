-- Second half of the change begun in the previous migration. A new order is a
-- lead waiting on a phone call, not a running subscription, so this is where a
-- Sale now starts its life.
ALTER TABLE "Sale" ALTER COLUMN "status" SET DEFAULT 'AWAITING_CALLBACK';
