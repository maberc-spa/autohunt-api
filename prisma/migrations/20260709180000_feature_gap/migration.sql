-- AlterTable: extend users, vehicles; add fuel types, documents, 2FA

CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PREMIUM_TIER_1', 'PREMIUM_TIER_2', 'PREMIUM_TIER_3');
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'APPLE');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'READY');

CREATE TABLE "fuel_type" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_type_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fuel_type_name_key" ON "fuel_type"("name");

INSERT INTO "fuel_type" ("name", "description", "updated_at") VALUES
  ('Gasolina', 'Motor a gasolina', CURRENT_TIMESTAMP),
  ('Diésel', 'Motor diésel', CURRENT_TIMESTAMP),
  ('Eléctrico', 'Motor eléctrico', CURRENT_TIMESTAMP),
  ('Híbrido', 'Motor híbrido', CURRENT_TIMESTAMP),
  ('GLP', 'Gas licuado de petróleo', CURRENT_TIMESTAMP),
  ('GNC', 'Gas natural comprimido', CURRENT_TIMESTAMP);

ALTER TABLE "user" ADD COLUMN "username" TEXT;
ALTER TABLE "user" ADD COLUMN "first_name" TEXT;
ALTER TABLE "user" ADD COLUMN "last_name" TEXT;
ALTER TABLE "user" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "plan" "UserPlan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "user" ADD COLUMN "plan_vehicle_limit" INTEGER;
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "oauth_provider" "OAuthProvider";
ALTER TABLE "user" ADD COLUMN "oauth_id" TEXT;
ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL;

UPDATE "user" SET
  "username" = split_part("email", '@', 1) || '_' || "id"::text,
  "first_name" = split_part("name", ' ', 1),
  "last_name" = COALESCE(NULLIF(substring("name" from position(' ' in "name") + 1), ''), split_part("name", ' ', 1))
WHERE "username" IS NULL;

ALTER TABLE "user" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "last_name" SET NOT NULL;

CREATE UNIQUE INDEX "user_username_key" ON "user"("username");
CREATE UNIQUE INDEX "user_oauth_provider_oauth_id_key" ON "user"("oauth_provider", "oauth_id");

ALTER TABLE "vehicle" ADD COLUMN "name" TEXT;
ALTER TABLE "vehicle" ADD COLUMN "country_id" INTEGER;
ALTER TABLE "vehicle" ADD COLUMN "fuel_type_id" INTEGER;
ALTER TABLE "vehicle" ADD COLUMN "cylinder" DECIMAL(4,1);
ALTER TABLE "vehicle" ALTER COLUMN "year" DROP NOT NULL;

UPDATE "vehicle" v SET
  "name" = 'Vehículo #' || v."id"::text,
  "country_id" = b."country_id",
  "fuel_type_id" = (SELECT "id" FROM "fuel_type" LIMIT 1)
FROM "brand" b
WHERE v."brand_id" = b."id" AND v."name" IS NULL;

ALTER TABLE "vehicle" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "vehicle" ALTER COLUMN "country_id" SET NOT NULL;
ALTER TABLE "vehicle" ALTER COLUMN "fuel_type_id" SET NOT NULL;

ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_country_id_fkey"
  FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_fuel_type_id_fkey"
  FOREIGN KEY ("fuel_type_id") REFERENCES "fuel_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "vehicle_document" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "file_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_document_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "vehicle_document" ADD CONSTRAINT "vehicle_document_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_document" ADD CONSTRAINT "vehicle_document_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "two_factor_challenge" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_challenge_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "two_factor_challenge" ADD CONSTRAINT "two_factor_challenge_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
