-- Lets an admin remove a salesperson who has sales behind them without
-- orphaning the commission history that points at their name. Sign-in is
-- refused while this is false and their referral tags stop attributing;
-- someone with no sales at all is deleted outright instead.
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
