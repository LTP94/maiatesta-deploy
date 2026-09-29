-- Etapa 3: inbox duradero, leases recuperables y resolución de tenant con
-- privilegio mínimo. Esta migración amplía (no reemplaza) el borrador
-- 20260929184009 recuperado del agente anterior.

ALTER TABLE "message_events"
  ALTER COLUMN "phoneNumberId" DROP NOT NULL,
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "wabaId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "encryptedPayload" TEXT,
  ADD COLUMN "normalizedPayload" JSONB,
  ADD COLUMN "eventCategory" TEXT,
  ADD COLUMN "contractVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "eventTimestamp" TIMESTAMP(3),
  ADD COLUMN "lastErrorCode" TEXT,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "retentionExpiresAt" TIMESTAMP(3);

-- Compatibilidad no destructiva con filas de Etapas 1/2. El payload original
-- no existía y no puede inventarse: quedan en cuarentena explícita.
UPDATE "message_events" event
SET
  "tenantId" = auth."tenantId",
  "wabaId" = waba."wabaId",
  "idempotencyKey" = md5(auth."tenantId" || ':' || event.id || ':' || event."metaEventId"),
  "encryptedPayload" = '',
  "eventCategory" = CASE event.origin::text
    WHEN 'CUSTOMER' THEN 'CUSTOMER_INBOUND'
    WHEN 'BUSINESS_APP_ECHO' THEN 'BUSINESS_APP_ECHO'
    WHEN 'STATUS_UPDATE' THEN 'API_OUTBOUND_STATUS'
    WHEN 'HISTORY_SYNC' THEN 'HISTORY_SYNC'
    WHEN 'CONTACT_SYNC' THEN 'CONTACT_SYNC'
    WHEN 'ACCOUNT_EVENT' THEN 'ADMINISTRATIVE_EVENT'
    ELSE 'UNKNOWN_EVENT'
  END,
  "retentionExpiresAt" = event."receivedAt" + interval '30 days',
  "processingState" = CASE WHEN event."encryptedPayload" IS NULL THEN 'QUARANTINED'::"ProcessingState" ELSE event."processingState" END,
  "lastErrorCode" = CASE WHEN event."encryptedPayload" IS NULL THEN 'LEGACY_PAYLOAD_UNAVAILABLE' ELSE event."lastErrorCode" END
FROM "phone_numbers" phone
JOIN "whatsapp_business_accounts" waba ON waba.id = phone."whatsappBusinessAccountId"
JOIN "meta_authorizations" auth ON auth.id = waba."metaAuthorizationId"
WHERE event."phoneNumberId" = phone.id;

ALTER TABLE "message_events"
  ALTER COLUMN "tenantId" SET NOT NULL,
  ALTER COLUMN "wabaId" SET NOT NULL,
  ALTER COLUMN "idempotencyKey" SET NOT NULL,
  ALTER COLUMN "encryptedPayload" SET NOT NULL,
  ALTER COLUMN "eventCategory" SET NOT NULL,
  ALTER COLUMN "retentionExpiresAt" SET NOT NULL;

ALTER TABLE "message_events"
  ADD CONSTRAINT "message_events_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_events" DROP CONSTRAINT "message_events_phoneNumberId_fkey";
ALTER TABLE "message_events"
  ADD CONSTRAINT "message_events_phoneNumberId_fkey"
    FOREIGN KEY ("phoneNumberId") REFERENCES "phone_numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "message_events_idempotencyKey_key" ON "message_events"("idempotencyKey");
CREATE INDEX "message_events_tenantId_processingState_nextAttemptAt_idx"
  ON "message_events"("tenantId", "processingState", "nextAttemptAt");
CREATE INDEX "message_events_processingState_nextAttemptAt_idx"
  ON "message_events"("processingState", "nextAttemptAt");

DROP POLICY message_events_isolation ON "message_events";
CREATE POLICY message_events_isolation ON "message_events"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE TABLE "webhook_quarantine_events" (
  "id" TEXT NOT NULL,
  "wabaId" TEXT,
  "rawPayloadHash" TEXT NOT NULL,
  "encryptedPayload" TEXT NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "retentionExpiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "webhook_quarantine_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "webhook_quarantine_events_reasonCode_receivedAt_idx"
  ON "webhook_quarantine_events"("reasonCode", "receivedAt");
CREATE UNIQUE INDEX "webhook_quarantine_events_wabaId_rawPayloadHash_reasonCode_key"
  ON "webhook_quarantine_events"("wabaId", "rawPayloadHash", "reasonCode");

CREATE TABLE "waba_webhook_subscriptions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "wabaId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "checkedAt" TIMESTAMP(3),
  "subscribedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waba_webhook_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "waba_webhook_subscriptions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "waba_webhook_subscriptions_wabaId_key" ON "waba_webhook_subscriptions"("wabaId");
CREATE INDEX "waba_webhook_subscriptions_tenantId_idx" ON "waba_webhook_subscriptions"("tenantId");

GRANT SELECT, INSERT, UPDATE, DELETE ON "waba_webhook_subscriptions" TO app_runtime;
ALTER TABLE "waba_webhook_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waba_webhook_subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY waba_webhook_subscriptions_isolation ON "waba_webhook_subscriptions"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

-- Ningún acceso directo global al mapa de WABA ni a la cuarentena.
REVOKE ALL ON "waba_routes" FROM app_runtime;
REVOKE ALL ON "webhook_quarantine_events" FROM app_runtime;

CREATE OR REPLACE FUNCTION upsert_waba_route(requested_waba_id TEXT, requested_tenant_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('app.current_tenant_id', true) IS DISTINCT FROM requested_tenant_id THEN
    RAISE EXCEPTION 'tenant context mismatch';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "whatsapp_business_accounts" w
    JOIN "meta_authorizations" a ON a.id = w."metaAuthorizationId"
    WHERE w."wabaId" = requested_waba_id AND a."tenantId" = requested_tenant_id
  ) THEN
    RAISE EXCEPTION 'WABA does not belong to tenant context';
  END IF;
  INSERT INTO "waba_routes" ("wabaId", "tenantId", "createdAt", "updatedAt")
  VALUES (requested_waba_id, requested_tenant_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT ("wabaId") DO UPDATE SET "tenantId" = EXCLUDED."tenantId", "updatedAt" = CURRENT_TIMESTAMP;
END;
$$;

-- Devuelve solo la ruta solicitada y valida WABA/autorización/número. El
-- llamador no obtiene capacidad para listar tenants o conexiones.
CREATE OR REPLACE FUNCTION resolve_webhook_route(
  requested_waba_id TEXT,
  routing_kind TEXT,
  routing_value TEXT
) RETURNS TABLE("tenantId" TEXT, "phoneRowId" TEXT, "resultCode" TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  resolved_tenant TEXT;
  resolved_phone TEXT;
BEGIN
  SELECT route."tenantId" INTO resolved_tenant
  FROM "waba_routes" route WHERE route."wabaId" = requested_waba_id;

  IF resolved_tenant IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, 'UNKNOWN_WABA'::TEXT;
    RETURN;
  END IF;

  PERFORM set_config('app.current_tenant_id', resolved_tenant, true);

  IF routing_kind = 'unroutable' THEN
    IF EXISTS (
      SELECT 1 FROM "whatsapp_business_accounts" w
      JOIN "meta_authorizations" a ON a.id = w."metaAuthorizationId"
      WHERE w."wabaId" = requested_waba_id AND a."tenantId" = resolved_tenant AND a.status = 'ACTIVE'
    ) THEN
      RETURN QUERY SELECT resolved_tenant, NULL::TEXT, 'ROUTED_ADMIN'::TEXT;
    ELSE
      RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, 'INACTIVE_AUTHORIZATION'::TEXT;
    END IF;
    RETURN;
  END IF;

  SELECT p.id INTO resolved_phone
  FROM "phone_numbers" p
  JOIN "whatsapp_business_accounts" w ON w.id = p."whatsappBusinessAccountId"
  JOIN "meta_authorizations" a ON a.id = w."metaAuthorizationId"
  WHERE w."wabaId" = requested_waba_id
    AND a."tenantId" = resolved_tenant
    AND a.status = 'ACTIVE'
    AND p."connectionState" = 'OPERATIONAL'
    AND ((routing_kind = 'phoneNumberId' AND p."phoneNumberId" = routing_value)
      OR (routing_kind = 'displayPhoneNumber' AND p."displayPhoneNumber" = routing_value))
  LIMIT 1;

  IF resolved_phone IS NULL THEN
    RETURN QUERY SELECT resolved_tenant, NULL::TEXT, 'PHONE_MISMATCH_OR_INACTIVE'::TEXT;
  ELSE
    RETURN QUERY SELECT resolved_tenant, resolved_phone, 'ROUTED'::TEXT;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION store_webhook_quarantine(
  event_id TEXT,
  requested_waba_id TEXT,
  payload_hash TEXT,
  encrypted_payload TEXT,
  reason_code TEXT,
  expires_at TIMESTAMP(3)
) RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO "webhook_quarantine_events"
    (id, "wabaId", "rawPayloadHash", "encryptedPayload", "reasonCode", "retentionExpiresAt")
  VALUES (event_id, requested_waba_id, payload_hash, encrypted_payload, reason_code, expires_at)
  ON CONFLICT ("wabaId", "rawPayloadHash", "reasonCode") DO UPDATE
    SET "duplicateCount" = "webhook_quarantine_events"."duplicateCount" + 1,
        "lastReceivedAt" = CURRENT_TIMESTAMP;
$$;

REVOKE ALL ON FUNCTION resolve_webhook_route(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION store_webhook_quarantine(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP(3)) FROM PUBLIC;
REVOKE ALL ON FUNCTION upsert_waba_route(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_webhook_route(TEXT, TEXT, TEXT) TO app_runtime;
GRANT EXECUTE ON FUNCTION store_webhook_quarantine(TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP(3)) TO app_runtime;
GRANT EXECUTE ON FUNCTION upsert_waba_route(TEXT, TEXT) TO app_runtime;

-- Reclama como máximo un evento por tenant en cada llamada. Las llamadas
-- sucesivas mantienen throughput sin permitir que una cola grande monopolice
-- indefinidamente al resto. Un lease vencido vuelve a ser reclamable.
CREATE OR REPLACE FUNCTION claim_webhook_events(
  worker_id TEXT,
  claim_limit INTEGER,
  lease_seconds INTEGER
) RETURNS TABLE("eventId" TEXT, "tenantId" TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  route_tenant TEXT;
  candidate_id TEXT;
  emitted INTEGER := 0;
BEGIN
  IF claim_limit < 1 OR claim_limit > 100 OR lease_seconds < 5 OR lease_seconds > 900 THEN
    RAISE EXCEPTION 'invalid claim parameters';
  END IF;

  FOR route_tenant IN
    SELECT DISTINCT route."tenantId" FROM "waba_routes" route ORDER BY route."tenantId"
  LOOP
    EXIT WHEN emitted >= claim_limit;
    PERFORM set_config('app.current_tenant_id', route_tenant, true);

    SELECT event.id INTO candidate_id
    FROM "message_events" event
    WHERE event."tenantId" = route_tenant
      AND (
        (event."processingState" IN ('PENDING', 'RETRY_PENDING') AND event."nextAttemptAt" <= CURRENT_TIMESTAMP)
        OR (event."processingState" = 'PROCESSING' AND event."leaseExpiresAt" < CURRENT_TIMESTAMP)
      )
    ORDER BY event."receivedAt", event.id
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF candidate_id IS NOT NULL THEN
      UPDATE "message_events"
      SET "processingState" = 'PROCESSING',
          "processingAttempts" = "processingAttempts" + 1,
          "leaseOwner" = worker_id,
          "leaseExpiresAt" = CURRENT_TIMESTAMP + make_interval(secs => lease_seconds)
      WHERE id = candidate_id;
      "eventId" := candidate_id;
      "tenantId" := route_tenant;
      emitted := emitted + 1;
      RETURN NEXT;
      candidate_id := NULL;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION claim_webhook_events(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_webhook_events(TEXT, INTEGER, INTEGER) TO app_runtime;
