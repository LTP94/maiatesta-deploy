-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "OnboardingState" AS ENUM ('INITIATED', 'AWAITING_AUTHORIZATION', 'AUTHORIZED_BY_META', 'CREDENTIALS_VERIFIED', 'INTERNAL_CONFIG_PENDING', 'OPERATIONAL', 'RECOVERABLE_ERROR', 'CANCELLED', 'EXPIRED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ConnectionState" AS ENUM ('PENDING_INTERNAL_SETUP', 'OPERATIONAL', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "CredentialKind" AS ENUM ('SYSTEM_USER_ACCESS_TOKEN', 'WHATSAPP_ACCESS_TOKEN');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageOrigin" AS ENUM ('CUSTOMER', 'BUSINESS_APP_ECHO', 'API_SENT', 'STATUS_UPDATE');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "state" "OnboardingState" NOT NULL DEFAULT 'INITIATED',
    "metaSessionInfo" JSONB,
    "failureReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_authorizations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "onboardingSessionId" TEXT NOT NULL,
    "metaUserId" TEXT NOT NULL,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_business_accounts" (
    "id" TEXT NOT NULL,
    "metaAuthorizationId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "businessName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_business_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_numbers" (
    "id" TEXT NOT NULL,
    "whatsappBusinessAccountId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "displayPhoneNumber" TEXT,
    "connectionState" "ConnectionState" NOT NULL DEFAULT 'PENDING_INTERNAL_SETUP',
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "metaAuthorizationId" TEXT NOT NULL,
    "kind" "CredentialKind" NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "evolutionInstanceId" TEXT,
    "chatwootAccountId" TEXT,
    "chatwootInboxId" TEXT,
    "typebotFlowId" TEXT,
    "n8nWorkflowId" TEXT,
    "provisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_events" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "metaEventId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "origin" "MessageOrigin" NOT NULL,
    "waMessageId" TEXT,
    "contactWaId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayloadHash" TEXT NOT NULL,

    CONSTRAINT "message_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "admin_users_tenantId_idx" ON "admin_users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_tenantId_email_key" ON "admin_users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_sessions_nonce_key" ON "onboarding_sessions"("nonce");

-- CreateIndex
CREATE INDEX "onboarding_sessions_tenantId_idx" ON "onboarding_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "onboarding_sessions_expiresAt_idx" ON "onboarding_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "meta_authorizations_onboardingSessionId_key" ON "meta_authorizations"("onboardingSessionId");

-- CreateIndex
CREATE INDEX "meta_authorizations_metaUserId_idx" ON "meta_authorizations"("metaUserId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_authorizations_tenantId_metaUserId_key" ON "meta_authorizations"("tenantId", "metaUserId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_business_accounts_wabaId_key" ON "whatsapp_business_accounts"("wabaId");

-- CreateIndex
CREATE UNIQUE INDEX "phone_numbers_phoneNumberId_key" ON "phone_numbers"("phoneNumberId");

-- CreateIndex
CREATE INDEX "credentials_metaAuthorizationId_idx" ON "credentials"("metaAuthorizationId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_phoneNumberId_key" ON "integration_configs"("phoneNumberId");

-- CreateIndex
CREATE INDEX "message_events_phoneNumberId_receivedAt_idx" ON "message_events"("phoneNumberId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_events_phoneNumberId_metaEventId_key" ON "message_events"("phoneNumberId", "metaEventId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_authorizations" ADD CONSTRAINT "meta_authorizations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_authorizations" ADD CONSTRAINT "meta_authorizations_onboardingSessionId_fkey" FOREIGN KEY ("onboardingSessionId") REFERENCES "onboarding_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_business_accounts" ADD CONSTRAINT "whatsapp_business_accounts_metaAuthorizationId_fkey" FOREIGN KEY ("metaAuthorizationId") REFERENCES "meta_authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_whatsappBusinessAccountId_fkey" FOREIGN KEY ("whatsappBusinessAccountId") REFERENCES "whatsapp_business_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_metaAuthorizationId_fkey" FOREIGN KEY ("metaAuthorizationId") REFERENCES "meta_authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "phone_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "phone_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
