-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('project_created', 'investor_registered', 'investor_kyc_uploaded', 'investor_kyc_status_changed', 'investor_status_changed', 'investor_verified', 'investment_created', 'investment_status_changed', 'monthly_rate_set', 'disbursement_batch_created', 'disbursement_batch_exported', 'disbursement_batch_confirmed', 'withdrawal_status_changed', 'referral_code_generated', 'company_document_uploaded', 'admin_login', 'admin_login_failed', 'admin_password_reset', 'admin_invite_accepted', 'admin_created', 'admin_invite_resent');

-- CreateEnum
CREATE TYPE "InvestorCategory" AS ENUM ('bronze', 'silver', 'gold', 'diamond', 'platinum', 'titanium');

-- CreateEnum
CREATE TYPE "InvestorStatus" AS ENUM ('pending', 'uploaded_kyc', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "KycDocType" AS ENUM ('nid', 'photo', 'other');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('savings', 'current');

-- CreateEnum
CREATE TYPE "BankSelected" AS ENUM ('city_bank', 'others');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'OPEN', 'FULL', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CompanyDocType" AS ENUM ('trade_license', 'nid', 'bank_account', 'deed');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('fixed', 'unfixed');

-- CreateEnum
CREATE TYPE "DisbursementPeriod" AS ENUM ('monthly', 'quarterly', 'half_yearly', 'yearly');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('pending', 'active');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('accrued', 'disbursed');

-- CreateEnum
CREATE TYPE "DisbursementExportType" AS ENUM ('cbl', 'beftn');

-- CreateEnum
CREATE TYPE "DisbursementBatchStatus" AS ENUM ('draft', 'exported', 'confirmed');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('cbl', 'beftn');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('pending', 'notice_period', 'ready', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "WithdrawalMethod" AS ENUM ('manual', 'auto');

-- CreateEnum
CREATE TYPE "IncomingPaymentMethod" AS ENUM ('bkash', 'nagad', 'rocket', 'bank_transfer');

-- CreateEnum
CREATE TYPE "IncomingPaymentStatus" AS ENUM ('pending', 'confirmed', 'overdue');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'INVESTOR');

-- CreateEnum
CREATE TYPE "AdminNotificationType" AS ENUM ('upcoming_payout', 'slot_reminder', 'new_investment_request', 'disbursement_sent', 'company_document_expiring');

-- CreateEnum
CREATE TYPE "PayoutSchedule" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "DisbursementSlot" AS ENUM ('slot_1', 'slot_2', 'slot_3', 'slot_4');

-- CreateEnum
CREATE TYPE "PasswordTokenPurpose" AS ENUM ('PASSWORD_RESET', 'ACCOUNT_INVITE');

-- CreateEnum
CREATE TYPE "LogModule" AS ENUM ('AUTH', 'USER', 'INVESTOR', 'KYC', 'BANK_ACCOUNT', 'PROJECT', 'INVESTMENT', 'PAYMENT', 'DISBURSEMENT', 'WITHDRAWAL', 'PROFIT_LEDGER', 'REFERRAL', 'DOCUMENT', 'LEAD', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'INVESTOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_tokens" (
    "id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "purpose" "PasswordTokenPurpose" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "requested_ip" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,

    CONSTRAINT "password_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklisted_tokens" (
    "jti" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,

    CONSTRAINT "blacklisted_tokens_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_by_ip" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "identifier" VARCHAR(150) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt" TIMESTAMP(3) NOT NULL,
    "blocked_until" TIMESTAMP(3),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("identifier")
);

-- CreateTable
CREATE TABLE "investors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "total_investment_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "address" TEXT,
    "profession" VARCHAR(150),
    "workplace" VARCHAR(150),
    "category" "InvestorCategory" NOT NULL DEFAULT 'bronze',
    "status" "InvestorStatus" NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMP(3),
    "approvedBy" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "investors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_profiles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150),
    "allowed_ip_range" VARCHAR(100),
    "department" VARCHAR(100),
    "user_id" UUID NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_kyc_documents" (
    "id" UUID NOT NULL,
    "nidFront" TEXT NOT NULL,
    "nidBack" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "investorId" UUID NOT NULL,

    CONSTRAINT "investor_kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_bank_accounts" (
    "id" UUID NOT NULL,
    "selected_bank" "BankSelected" NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "account_name" VARCHAR(150) NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "routing_number" VARCHAR(9),
    "account_type" "BankAccountType",
    "branchName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "investor_id" UUID NOT NULL,

    CONSTRAINT "investor_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominees" (
    "id" UUID NOT NULL,
    "nominee_name" VARCHAR(150) NOT NULL,
    "nomineeNidFront" VARCHAR(30),
    "nomineeNidBack" VARCHAR(30),
    "nominee_photo" TEXT,
    "nominee_phone" VARCHAR(20) NOT NULL,
    "relation" VARCHAR(50) NOT NULL,
    "investor_id" UUID NOT NULL,

    CONSTRAINT "nominees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "minimumInvestment" DECIMAL(18,2) NOT NULL,
    "maximumInvestment" DECIMAL(18,2),
    "targetAmount" DECIMAL(18,2),
    "totalInvestedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_documents" (
    "id" UUID NOT NULL,
    "doc_type" "CompanyDocType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATE,

    CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" UUID NOT NULL,
    "investment_date" TIMESTAMP(3),
    "amount" DECIMAL(14,2) NOT NULL,
    "investment_type" "InvestmentType" NOT NULL,
    "rate" DECIMAL(5,2),
    "investment_period_months" INTEGER DEFAULT 3,
    "disbursement_period" "DisbursementPeriod" NOT NULL,
    "agreement_place" VARCHAR(150),
    "agreement_end_date" DATE,
    "deedOffical" TEXT,
    "deedGoverment" TEXT,
    "cheque_given" BOOLEAN NOT NULL DEFAULT false,
    "cash_vouchar_given" BOOLEAN NOT NULL DEFAULT false,
    "special_instruction" TEXT,
    "souvenir_given" BOOLEAN NOT NULL DEFAULT false,
    "is_souvenir_applicable" BOOLEAN NOT NULL DEFAULT true,
    "certificate_given" BOOLEAN NOT NULL DEFAULT false,
    "is_certificate_applicable" BOOLEAN NOT NULL DEFAULT true,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "investor_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "disbursement_slot" "DisbursementSlot",
    "slot_manually_moved" BOOLEAN NOT NULL DEFAULT false,
    "slot_adjustment_days" INTEGER,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_documents" (
    "id" UUID NOT NULL,
    "online_deed" TEXT,
    "certificate" TEXT,
    "cheque" TEXT,
    "cash_voucher" TEXT,
    "membership_card" TEXT,
    "souvenir" TEXT,
    "proof_photo" TEXT,
    "clearance_video" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "investment_id" UUID NOT NULL,

    CONSTRAINT "investment_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_rate_settings" (
    "id" UUID NOT NULL,
    "period_month" DATE NOT NULL,
    "rate_percent" DECIMAL(5,2) NOT NULL,
    "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_rate_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_profit_ledger" (
    "id" UUID NOT NULL,
    "period_month" DATE NOT NULL,
    "rate_applied" DECIMAL(5,2) NOT NULL,
    "profit_amount" DECIMAL(14,2) NOT NULL,
    "payout_status" "PayoutStatus" NOT NULL DEFAULT 'accrued',
    "investment_id" UUID NOT NULL,
    "disbursement_item_id" UUID,

    CONSTRAINT "monthly_profit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursement_batches" (
    "id" UUID NOT NULL,
    "slot" "DisbursementSlot" NOT NULL,
    "slot_label" VARCHAR(50) NOT NULL,
    "batch_date" DATE NOT NULL,
    "export_type" "DisbursementExportType" NOT NULL,
    "file_url" TEXT,
    "status" "DisbursementBatchStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disbursement_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursement_items" (
    "id" UUID NOT NULL,
    "reason" VARCHAR(150) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "export_format" "ExportFormat" NOT NULL,
    "remarks" VARCHAR(255),
    "investment_id" UUID NOT NULL,
    "investor_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "snapshotBankName" TEXT NOT NULL,
    "snapshotAccountName" TEXT NOT NULL,
    "snapshotAccountNumber" TEXT NOT NULL,
    "snapshotRoutingNumber" TEXT,
    "snapshotAccountType" TEXT,
    "snapshotBranchName" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disbursement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" UUID NOT NULL,
    "requested_amount" DECIMAL(14,2) NOT NULL,
    "withdrawal_method" "WithdrawalMethod" NOT NULL DEFAULT 'auto',
    "request_date" DATE NOT NULL,
    "notice_period_days" INTEGER,
    "notice_period_end" DATE,
    "disbursement_date" DATE,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'pending',
    "investment_id" UUID NOT NULL,
    "paid_disbursement_item_id" UUID,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incoming_payments" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "payment_method" "IncomingPaymentMethod" NOT NULL,
    "screenshot_url" TEXT NOT NULL,
    "sender_account_info" VARCHAR(150),
    "installment_number" INTEGER,
    "due_date" DATE,
    "confirmed_at" TIMESTAMP(3),
    "status" "IncomingPaymentStatus" NOT NULL DEFAULT 'pending',
    "investment_id" UUID NOT NULL,

    CONSTRAINT "incoming_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "referrer_id" UUID NOT NULL,
    "referred_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "used_at" TIMESTAMP(3),

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referred_investor_id" UUID NOT NULL,
    "referral_code_id" UUID NOT NULL,
    "bonus_percent" DECIMAL(5,2) DEFAULT 1.00,
    "bonus_amount" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roi_calculator_leads" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150),
    "entered_amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followed_up" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roi_calculator_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" UUID NOT NULL,
    "type" "AdminNotificationType" NOT NULL,
    "reference_id" UUID,
    "message" VARCHAR(255),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clickLink" TEXT,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "adminName" TEXT,
    "adminProfileId" UUID,
    "action" "AuditAction" NOT NULL,
    "module" "LogModule",
    "severity" "LogSeverity" NOT NULL DEFAULT 'INFO',
    "status" "LogStatus" NOT NULL DEFAULT 'SUCCESS',
    "targetLabel" TEXT,
    "target_table" VARCHAR(50) NOT NULL,
    "target_id" UUID NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "statement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "password_tokens_token_hash_key" ON "password_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_tokens_user_id_created_at_idx" ON "password_tokens"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "password_tokens_expires_at_idx" ON "password_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_expires_at_idx" ON "blacklisted_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "login_attempts_last_attempt_idx" ON "login_attempts"("last_attempt");

-- CreateIndex
CREATE UNIQUE INDEX "investors_user_id_key" ON "investors"("user_id");

-- CreateIndex
CREATE INDEX "investors_status_idx" ON "investors"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_user_id_key" ON "admin_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "investor_kyc_documents_investorId_key" ON "investor_kyc_documents"("investorId");

-- CreateIndex
CREATE INDEX "investor_kyc_documents_verification_status_idx" ON "investor_kyc_documents"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "nominees_investor_id_key" ON "nominees"("investor_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_isVisible_isActive_idx" ON "projects"("isVisible", "isActive");

-- CreateIndex
CREATE INDEX "company_documents_doc_type_is_current_idx" ON "company_documents"("doc_type", "is_current");

-- CreateIndex
CREATE INDEX "investments_investor_id_idx" ON "investments"("investor_id");

-- CreateIndex
CREATE INDEX "investments_project_id_idx" ON "investments"("project_id");

-- CreateIndex
CREATE INDEX "investments_status_idx" ON "investments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "investment_documents_investment_id_key" ON "investment_documents"("investment_id");

-- CreateIndex
CREATE INDEX "investment_documents_investment_id_idx" ON "investment_documents"("investment_id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_rate_settings_period_month_key" ON "monthly_rate_settings"("period_month");

-- CreateIndex
CREATE INDEX "monthly_profit_ledger_period_month_idx" ON "monthly_profit_ledger"("period_month");

-- CreateIndex
CREATE INDEX "monthly_profit_ledger_payout_status_idx" ON "monthly_profit_ledger"("payout_status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_profit_ledger_investment_id_period_month_key" ON "monthly_profit_ledger"("investment_id", "period_month");

-- CreateIndex
CREATE INDEX "disbursement_batches_slot_batch_date_idx" ON "disbursement_batches"("slot", "batch_date");

-- CreateIndex
CREATE INDEX "disbursement_batches_status_idx" ON "disbursement_batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_requests_paid_disbursement_item_id_key" ON "withdrawal_requests"("paid_disbursement_item_id");

-- CreateIndex
CREATE INDEX "withdrawal_requests_investment_id_idx" ON "withdrawal_requests"("investment_id");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX "incoming_payments_investment_id_idx" ON "incoming_payments"("investment_id");

-- CreateIndex
CREATE INDEX "incoming_payments_status_idx" ON "incoming_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_referred_id_key" ON "referral_codes"("referred_id");

-- CreateIndex
CREATE INDEX "referral_codes_referrer_id_idx" ON "referral_codes"("referrer_id");

-- CreateIndex
CREATE INDEX "referral_codes_referrer_id_is_used_idx" ON "referral_codes"("referrer_id", "is_used");

-- CreateIndex
CREATE INDEX "referral_codes_expires_at_idx" ON "referral_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_investor_id_key" ON "referrals"("referred_investor_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrer_id_referred_investor_id_key" ON "referrals"("referrer_id", "referred_investor_id");

-- CreateIndex
CREATE INDEX "roi_calculator_leads_followed_up_idx" ON "roi_calculator_leads"("followed_up");

-- CreateIndex
CREATE INDEX "admin_notifications_is_read_created_at_idx" ON "admin_notifications"("is_read", "created_at");

-- CreateIndex
CREATE INDEX "admin_notifications_type_idx" ON "admin_notifications"("type");

-- CreateIndex
CREATE INDEX "AuditLog_adminProfileId_idx" ON "AuditLog"("adminProfileId");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_target_id_idx" ON "AuditLog"("target_id");

-- AddForeignKey
ALTER TABLE "password_tokens" ADD CONSTRAINT "password_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklisted_tokens" ADD CONSTRAINT "blacklisted_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investors" ADD CONSTRAINT "investors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_kyc_documents" ADD CONSTRAINT "investor_kyc_documents_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_bank_accounts" ADD CONSTRAINT "investor_bank_accounts_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominees" ADD CONSTRAINT "nominees_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_documents" ADD CONSTRAINT "investment_documents_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_profit_ledger" ADD CONSTRAINT "monthly_profit_ledger_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_profit_ledger" ADD CONSTRAINT "monthly_profit_ledger_disbursement_item_id_fkey" FOREIGN KEY ("disbursement_item_id") REFERENCES "disbursement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_items" ADD CONSTRAINT "disbursement_items_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_items" ADD CONSTRAINT "disbursement_items_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursement_items" ADD CONSTRAINT "disbursement_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "disbursement_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_paid_disbursement_item_id_fkey" FOREIGN KEY ("paid_disbursement_item_id") REFERENCES "disbursement_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_payments" ADD CONSTRAINT "incoming_payments_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "investors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_investor_id_fkey" FOREIGN KEY ("referred_investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminProfileId_fkey" FOREIGN KEY ("adminProfileId") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
