-- Short handle for signing in, so staff don't retype a full email each time.
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- Seed from the email's local part, which is what someone would type anyway.
-- Only where it doesn't collide: two people on different domains can share a
-- local part, and the loser keeps a NULL username rather than the update
-- failing outright. An admin can set theirs by hand afterwards.
UPDATE "Profile" p
SET "username" = lower(split_part(p."email", '@', 1))
WHERE p."username" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Profile" other
    WHERE other."id" <> p."id"
      AND lower(split_part(other."email", '@', 1)) = lower(split_part(p."email", '@', 1))
  );

CREATE UNIQUE INDEX IF NOT EXISTS "Profile_username_key" ON "Profile"("username");
