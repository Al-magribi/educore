-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'cms_admin', 'spmb_admin', 'applicant');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('draft', 'pending_payment', 'paid', 'form_in_progress', 'submitted', 'under_review', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'manual_review');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('manual', 'midtrans');

-- CreateEnum
CREATE TYPE "NewsStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "HomeSectionType" AS ENUM ('hero', 'achievements', 'extracurricular', 'alumni_testimonials', 'spmb_cta');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'applicant',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "email_verification_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "street" TEXT,
    "district" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "country" TEXT DEFAULT 'Indonesia',
    "phone" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "site_title" TEXT,
    "maps_url" TEXT,
    "map_embed_url" TEXT,
    "office_hours" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "primary" TEXT NOT NULL DEFAULT '#2563eb',
    "primary_foreground" TEXT NOT NULL DEFAULT '#ffffff',
    "secondary" TEXT NOT NULL DEFAULT '#1e40af',
    "accent" TEXT NOT NULL DEFAULT '#3b82f6',
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_sections" (
    "id" TEXT NOT NULL,
    "type" "HomeSectionType" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_section_items" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "image_alt" TEXT,
    "link_url" TEXT,
    "metadata" JSONB,

    CONSTRAINT "home_section_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "about_pages" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "page_title" TEXT NOT NULL,
    "page_subtitle" TEXT,
    "page_image_url" TEXT,
    "page_image_alt" TEXT,
    "profile_title" TEXT,
    "profile_paragraphs" JSONB,
    "profile_highlights" JSONB,
    "vision_title" TEXT,
    "vision_content" TEXT,
    "mission_title" TEXT,
    "mission_items" JSONB,
    "values_title" TEXT,
    "values_items" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "cover_image" TEXT,
    "cover_alt" TEXT,
    "category" TEXT NOT NULL,
    "author_id" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "read_minutes" INTEGER NOT NULL DEFAULT 3,
    "status" "NewsStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spmb_landing_content" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "page" JSONB NOT NULL,
    "quick_info" JSONB,
    "schedule" JSONB,
    "flow" JSONB,
    "requirements" JSONB,
    "fees" JSONB,
    "faq" JSONB,
    "contact" JSONB,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "academic_year" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spmb_landing_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_periods" (
    "id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "opens_at" TIMESTAMP(3) NOT NULL,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_definitions" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schema" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_answers" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "application_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_files" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_responses" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "method" "PaymentMethod" NOT NULL,
    "external_id" TEXT,
    "proof_url" TEXT,
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "registration_fee" INTEGER NOT NULL DEFAULT 350000,
    "midtrans_enabled" BOOLEAN NOT NULL DEFAULT false,
    "midtrans_server_key" TEXT,
    "midtrans_client_key" TEXT,
    "midtrans_production" BOOLEAN NOT NULL DEFAULT false,
    "manual_instructions" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smtp_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "host" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "port" INTEGER NOT NULL DEFAULT 587,
    "user" TEXT,
    "password" TEXT,
    "from_name" TEXT,
    "from_email" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smtp_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "email_verification_codes_user_id_idx" ON "email_verification_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "home_sections_type_sort_order_idx" ON "home_sections"("type", "sort_order");

-- CreateIndex
CREATE INDEX "home_section_items_section_id_sort_order_idx" ON "home_section_items"("section_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "news_posts_slug_key" ON "news_posts"("slug");

-- CreateIndex
CREATE INDEX "news_posts_status_published_at_idx" ON "news_posts"("status", "published_at");

-- CreateIndex
CREATE INDEX "news_posts_category_idx" ON "news_posts"("category");

-- CreateIndex
CREATE INDEX "admission_periods_is_active_idx" ON "admission_periods"("is_active");

-- CreateIndex
CREATE INDEX "form_definitions_period_id_is_active_idx" ON "form_definitions"("period_id", "is_active");

-- CreateIndex
CREATE INDEX "questionnaires_period_id_idx" ON "questionnaires"("period_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_user_id_period_id_key" ON "applications"("user_id", "period_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_answers_application_id_field_id_key" ON "application_answers"("application_id", "field_id");

-- CreateIndex
CREATE INDEX "application_files_application_id_idx" ON "application_files"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_responses_application_id_questionnaire_id_key" ON "questionnaire_responses"("application_id", "questionnaire_id");

-- CreateIndex
CREATE INDEX "payments_application_id_idx" ON "payments"("application_id");

-- CreateIndex
CREATE INDEX "payments_external_id_idx" ON "payments"("external_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_section_items" ADD CONSTRAINT "home_section_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "home_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "admission_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "admission_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "admission_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_files" ADD CONSTRAINT "application_files_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

