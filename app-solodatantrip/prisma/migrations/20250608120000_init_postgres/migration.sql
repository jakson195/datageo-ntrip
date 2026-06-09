-- CreateEnum
CREATE TYPE "RtkLicenseStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RtkApiMode" AS ENUM ('TEST', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "TrialRegistryStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RtkAuditAction" AS ENUM ('LICENSE_CREATE', 'LICENSE_RENEW', 'LICENSE_EXPIRE', 'LICENSE_SUSPEND', 'LICENSE_WEBHOOK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "streams" INTEGER NOT NULL DEFAULT 0,
    "expiry_date" TIMESTAMP(3),
    "credentials_active" BOOLEAN NOT NULL DEFAULT false,
    "ntrip_server" TEXT NOT NULL DEFAULT 'sa.geodnet.com',
    "ntrip_port" TEXT NOT NULL DEFAULT '2101',
    "ntrip_mountpoint" TEXT NOT NULL DEFAULT 'AUTO',
    "ntrip_username" TEXT NOT NULL DEFAULT 'NONE',
    "ntrip_password_enc" TEXT NOT NULL DEFAULT 'NONE',
    "subscription_plan" TEXT NOT NULL DEFAULT 'pendente',
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'INATIVO',
    "subscription_label" TEXT NOT NULL DEFAULT 'Aguardando ativação',
    "active_license_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rtk_licenses" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" "RtkLicenseStatus" NOT NULL DEFAULT 'PENDING',
    "mode" "RtkApiMode" NOT NULL DEFAULT 'TEST',
    "expires_at" TIMESTAMP(3),
    "ntrip_server" TEXT NOT NULL,
    "ntrip_port" TEXT NOT NULL DEFAULT '2101',
    "ntrip_mountpoint" TEXT NOT NULL DEFAULT 'AUTO',
    "ntrip_username" TEXT NOT NULL,
    "ntrip_password_enc" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'rtkdata-reseller',
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rtk_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rtk_audit_logs" (
    "id" TEXT NOT NULL,
    "action" "RtkAuditAction" NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "license_id" TEXT,
    "ip" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rtk_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trial_registry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT,
    "license_id" TEXT,
    "status" "TrialRegistryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "trial_registry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_credentials_active_idx" ON "users"("credentials_active");

-- CreateIndex
CREATE UNIQUE INDEX "rtk_licenses_license_id_key" ON "rtk_licenses"("license_id");

-- CreateIndex
CREATE INDEX "rtk_licenses_user_id_idx" ON "rtk_licenses"("user_id");

-- CreateIndex
CREATE INDEX "rtk_licenses_license_id_idx" ON "rtk_licenses"("license_id");

-- CreateIndex
CREATE INDEX "rtk_licenses_status_idx" ON "rtk_licenses"("status");

-- CreateIndex
CREATE INDEX "rtk_licenses_expires_at_idx" ON "rtk_licenses"("expires_at");

-- CreateIndex
CREATE INDEX "rtk_licenses_is_primary_idx" ON "rtk_licenses"("is_primary");

-- CreateIndex
CREATE INDEX "rtk_licenses_deleted_at_idx" ON "rtk_licenses"("deleted_at");

-- CreateIndex
CREATE INDEX "rtk_audit_logs_user_id_idx" ON "rtk_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "rtk_audit_logs_license_id_idx" ON "rtk_audit_logs"("license_id");

-- CreateIndex
CREATE INDEX "rtk_audit_logs_action_idx" ON "rtk_audit_logs"("action");

-- CreateIndex
CREATE INDEX "rtk_audit_logs_created_at_idx" ON "rtk_audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "trial_registry_email_key" ON "trial_registry"("email");

-- CreateIndex
CREATE INDEX "trial_registry_email_idx" ON "trial_registry"("email");

-- CreateIndex
CREATE INDEX "trial_registry_status_idx" ON "trial_registry"("status");

-- CreateIndex
CREATE INDEX "trial_registry_deleted_at_idx" ON "trial_registry"("deleted_at");

-- AddForeignKey
ALTER TABLE "rtk_licenses" ADD CONSTRAINT "rtk_licenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rtk_audit_logs" ADD CONSTRAINT "rtk_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_registry" ADD CONSTRAINT "trial_registry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
