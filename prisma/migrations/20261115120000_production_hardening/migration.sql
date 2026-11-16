-- Session revocation: tokens carry the version they were issued for.
ALTER TABLE "user" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;

-- Emailed codes: what they unlock and how many wrong guesses they took.
CREATE TYPE "ChallengePurpose" AS ENUM ('LOGIN', 'PASSWORD_RESET');
ALTER TABLE "two_factor_challenge"
  ADD COLUMN "purpose" "ChallengePurpose" NOT NULL DEFAULT 'LOGIN',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Codes are now stored hashed: the pending plaintext ones can no longer be verified.
UPDATE "two_factor_challenge" SET "consumed_at" = NOW() WHERE "consumed_at" IS NULL;

-- Emails are compared case-insensitively.
CREATE INDEX "user_email_lower_idx" ON "user" (LOWER("email"));
