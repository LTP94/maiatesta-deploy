-- CreateEnum
CREATE TYPE "ProcessingState" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'MANUAL_INTERVENTION');

-- AlterEnum
ALTER TYPE "MessageDirection" ADD VALUE 'ADMINISTRATIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageOrigin" ADD VALUE 'CONTACT_SYNC';
ALTER TYPE "MessageOrigin" ADD VALUE 'HISTORY_SYNC';
ALTER TYPE "MessageOrigin" ADD VALUE 'ACCOUNT_EVENT';
ALTER TYPE "MessageOrigin" ADD VALUE 'UNCLASSIFIED';

-- AlterTable
ALTER TABLE "message_events" ADD COLUMN     "eligibleForAutomation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasMetaError" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastProcessingError" TEXT,
ADD COLUMN     "messageType" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processingState" "ProcessingState" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "statusValue" TEXT;

-- CreateTable
CREATE TABLE "conversation_automation_state" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "contactWaId" TEXT NOT NULL,
    "automationPaused" BOOLEAN NOT NULL DEFAULT false,
    "pausedReason" TEXT,
    "pausedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_automation_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waba_routes" (
    "wabaId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waba_routes_pkey" PRIMARY KEY ("wabaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_automation_state_phoneNumberId_contactWaId_key" ON "conversation_automation_state"("phoneNumberId", "contactWaId");

-- CreateIndex
CREATE INDEX "waba_routes_tenantId_idx" ON "waba_routes"("tenantId");

-- CreateIndex
CREATE INDEX "message_events_processingState_idx" ON "message_events"("processingState");

-- AddForeignKey
ALTER TABLE "conversation_automation_state" ADD CONSTRAINT "conversation_automation_state_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_automation_state" ADD CONSTRAINT "conversation_automation_state_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "phone_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waba_routes" ADD CONSTRAINT "waba_routes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Permisos para app_runtime en las tablas nuevas — la migración
-- enable_row_level_security original solo otorgó privilegios sobre las
-- tablas que existían EN ESE MOMENTO ("GRANT ... ON ALL TABLES IN SCHEMA
-- public" no es retroactivo a tablas creadas por migraciones posteriores).
-- Sin este GRANT explícito, app_runtime recibiría "permission denied" en
-- ambas tablas nuevas — no un silencio, un fallo duro y visible, pero hay
-- que otorgarlo aquí para que el servidor funcione en absoluto.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON "conversation_automation_state" TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON "waba_routes" TO app_runtime;

-- ---------------------------------------------------------------------------
-- conversation_automation_state: tabla operacional normal, con tenantId
-- directo — se aísla exactamente igual que el resto (Capa 2, RLS).
-- ---------------------------------------------------------------------------

ALTER TABLE "conversation_automation_state" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_automation_state" FORCE ROW LEVEL SECURITY;
CREATE POLICY conversation_automation_state_isolation ON "conversation_automation_state"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- ---------------------------------------------------------------------------
-- waba_routes: SIN Row-Level Security, DELIBERADAMENTE. Ver el comentario
-- del modelo WabaRoute en prisma/schema.prisma para la justificación
-- completa. Resumen: es la única tabla que un evento de webhook entrante
-- puede consultar ANTES de que exista un tenant fijado en la sesión (huevo
-- y gallina: para fijar app.current_tenant_id primero hay que saber cuál
-- es), y no contiene ningún dato de negocio — solo el mapeo (WABA id de
-- Meta) -> (tenantId interno). No se activa RLS aquí a propósito; NO es un
-- descuido.
-- ---------------------------------------------------------------------------
