-- CreateEnum
CREATE TYPE "ActivationSource" AS ENUM ('REGISTRATION', 'TRIAL', 'MANUAL', 'STRIPE', 'MERCADO_PAGO');

-- CreateEnum
CREATE TYPE "NtripSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NtripAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "billing_subscription_id" TEXT,
    "status" "NtripSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "source" "ActivationSource" NOT NULL DEFAULT 'REGISTRATION',
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ntrip_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "rtk_license_id" TEXT,
    "host" TEXT NOT NULL,
    "port" TEXT NOT NULL DEFAULT '2101',
    "mountpoint" TEXT NOT NULL DEFAULT 'AUTO',
    "username" TEXT NOT NULL,
    "password_enc" TEXT NOT NULL,
    "status" "NtripAccountStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3),
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "provisioned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ntrip_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_billing_subscription_id_key" ON "subscriptions"("billing_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_expires_at_idx" ON "subscriptions"("expires_at");

-- CreateIndex
CREATE INDEX "subscriptions_deleted_at_idx" ON "subscriptions"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "ntrip_accounts_rtk_license_id_key" ON "ntrip_accounts"("rtk_license_id");

-- CreateIndex
CREATE INDEX "ntrip_accounts_user_id_idx" ON "ntrip_accounts"("user_id");

-- CreateIndex
CREATE INDEX "ntrip_accounts_subscription_id_idx" ON "ntrip_accounts"("subscription_id");

-- CreateIndex
CREATE INDEX "ntrip_accounts_status_idx" ON "ntrip_accounts"("status");

-- CreateIndex
CREATE INDEX "ntrip_accounts_expires_at_idx" ON "ntrip_accounts"("expires_at");

-- CreateIndex
CREATE INDEX "ntrip_accounts_is_primary_idx" ON "ntrip_accounts"("is_primary");

-- CreateIndex
CREATE INDEX "ntrip_accounts_deleted_at_idx" ON "ntrip_accounts"("deleted_at");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billing_subscription_id_fkey" FOREIGN KEY ("billing_subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ntrip_accounts" ADD CONSTRAINT "ntrip_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ntrip_accounts" ADD CONSTRAINT "ntrip_accounts_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
