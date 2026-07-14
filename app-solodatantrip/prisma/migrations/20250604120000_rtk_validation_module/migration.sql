-- CreateEnum
CREATE TYPE "RtkSurveyStatus" AS ENUM ('DRAFT', 'ADJUSTED', 'EXPORTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RtkAdjustmentMethod" AS ENUM ('TRANSLATION', 'HELMERT_2D', 'HELMERT_3D');

-- CreateTable
CREATE TABLE "rtk_survey_projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "crs" TEXT NOT NULL DEFAULT 'EPSG:4674',
    "ntrip_caster" TEXT,
    "ntrip_mountpoint" TEXT,
    "status" "RtkSurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "adjustment_method" "RtkAdjustmentMethod",
    "rms_before" DOUBLE PRECISION,
    "rms_after" DOUBLE PRECISION,
    "helmert_params" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rtk_survey_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rtk_survey_points" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "e" DOUBLE PRECISION NOT NULL,
    "n" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "e_corr" DOUBLE PRECISION,
    "n_corr" DOUBLE PRECISION,
    "z_corr" DOUBLE PRECISION,
    "properties" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rtk_survey_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rtk_control_points" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "e_known" DOUBLE PRECISION NOT NULL,
    "n_known" DOUBLE PRECISION NOT NULL,
    "z_known" DOUBLE PRECISION NOT NULL,
    "e_observed" DOUBLE PRECISION NOT NULL,
    "n_observed" DOUBLE PRECISION NOT NULL,
    "z_observed" DOUBLE PRECISION NOT NULL,
    "residual_e" DOUBLE PRECISION,
    "residual_n" DOUBLE PRECISION,
    "residual_z" DOUBLE PRECISION,
    "rms" DOUBLE PRECISION,
    "is_outlier" BOOLEAN NOT NULL DEFAULT false,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rtk_control_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ntrip_quality_daily" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "caster_host" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fix_count" INTEGER NOT NULL DEFAULT 0,
    "float_count" INTEGER NOT NULL DEFAULT 0,
    "avg_satellites" DOUBLE PRECISION,
    "avg_hdop" DOUBLE PRECISION,
    "avg_vdop" DOUBLE PRECISION,
    "avg_correction_age" DOUBLE PRECISION,
    "uptime_percent" DOUBLE PRECISION,
    "avg_latency_ms" DOUBLE PRECISION,
    "avg_horiz_precision" DOUBLE PRECISION,
    "avg_vert_precision" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ntrip_quality_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rtk_survey_projects_user_id_idx" ON "rtk_survey_projects"("user_id");

-- CreateIndex
CREATE INDEX "rtk_survey_projects_status_idx" ON "rtk_survey_projects"("status");

-- CreateIndex
CREATE INDEX "rtk_survey_projects_created_at_idx" ON "rtk_survey_projects"("created_at");

-- CreateIndex
CREATE INDEX "rtk_survey_points_project_id_idx" ON "rtk_survey_points"("project_id");

-- CreateIndex
CREATE INDEX "rtk_control_points_project_id_idx" ON "rtk_control_points"("project_id");

-- CreateIndex
CREATE INDEX "ntrip_quality_daily_caster_host_idx" ON "ntrip_quality_daily"("caster_host");

-- CreateIndex
CREATE INDEX "ntrip_quality_daily_date_idx" ON "ntrip_quality_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ntrip_quality_daily_user_id_caster_host_date_key" ON "ntrip_quality_daily"("user_id", "caster_host", "date");

-- AddForeignKey
ALTER TABLE "rtk_survey_projects" ADD CONSTRAINT "rtk_survey_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rtk_survey_points" ADD CONSTRAINT "rtk_survey_points_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "rtk_survey_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rtk_control_points" ADD CONSTRAINT "rtk_control_points_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "rtk_survey_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ntrip_quality_daily" ADD CONSTRAINT "ntrip_quality_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
