-- Contact details were previously packed into `note` as a single string.
-- An agent working the callback queue needs to see the name and number
-- directly, and needs them queryable.
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;

-- Set when an agent marks the callback done.
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "calledBackAt" TIMESTAMP(3);
