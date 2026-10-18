-- CreateEnum
CREATE TYPE "UserMaintenanceRole" AS ENUM ('OWNER', 'MECHANIC', 'OTHER');

-- CreateTable
CREATE TABLE "country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "country_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_type" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "country_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "model_id" INTEGER NOT NULL,
    "vehicle_type_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "vin" TEXT,
    "license_plate" TEXT,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_type" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "mileage_at_service" INTEGER,
    "total_cost" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_maintenance" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "maintenance_id" INTEGER NOT NULL,
    "role" "UserMaintenanceRole" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_detail" (
    "id" SERIAL NOT NULL,
    "maintenance_id" INTEGER NOT NULL,
    "maintenance_type_id" INTEGER NOT NULL,
    "description" TEXT,
    "cost" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_detail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_name_key" ON "country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "country_code_key" ON "country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "brand_name_country_id_key" ON "brand"("name", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "model_brand_id_name_key" ON "model"("brand_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_type_name_key" ON "vehicle_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_vin_key" ON "vehicle"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_type_name_key" ON "maintenance_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_maintenance_user_id_maintenance_id_key" ON "user_maintenance"("user_id", "maintenance_id");

-- AddForeignKey
ALTER TABLE "brand" ADD CONSTRAINT "brand_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model" ADD CONSTRAINT "model_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_maintenance" ADD CONSTRAINT "user_maintenance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_maintenance" ADD CONSTRAINT "user_maintenance_maintenance_id_fkey" FOREIGN KEY ("maintenance_id") REFERENCES "maintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_detail" ADD CONSTRAINT "maintenance_detail_maintenance_id_fkey" FOREIGN KEY ("maintenance_id") REFERENCES "maintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_detail" ADD CONSTRAINT "maintenance_detail_maintenance_type_id_fkey" FOREIGN KEY ("maintenance_type_id") REFERENCES "maintenance_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
