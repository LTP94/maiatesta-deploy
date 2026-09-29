-- Retención automática, global y acotada para datos cifrados de webhook.
-- La función SECURITY DEFINER permite que app_runtime ejecute la limpieza
-- sin recibir SELECT/DELETE global sobre tablas protegidas por RLS.

CREATE INDEX "message_events_retentionExpiresAt_idx"
  ON "message_events"("retentionExpiresAt");

CREATE INDEX "webhook_quarantine_events_retentionExpiresAt_idx"
  ON "webhook_quarantine_events"("retentionExpiresAt");

CREATE OR REPLACE FUNCTION purge_expired_webhook_data(
  batch_limit INTEGER
) RETURNS TABLE(
  "messageEventsDeleted" INTEGER,
  "quarantineEventsDeleted" INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_messages INTEGER;
  deleted_quarantine INTEGER;
BEGIN
  IF batch_limit < 1 OR batch_limit > 5000 THEN
    RAISE EXCEPTION 'invalid retention batch limit';
  END IF;

  WITH expired AS (
    SELECT event.id
    FROM "message_events" event
    WHERE event."retentionExpiresAt" <= CURRENT_TIMESTAMP
      AND NOT (
        event."processingState" = 'PROCESSING'
        AND event."leaseExpiresAt" IS NOT NULL
        AND event."leaseExpiresAt" >= CURRENT_TIMESTAMP
      )
    ORDER BY event."retentionExpiresAt", event.id
    FOR UPDATE SKIP LOCKED
    LIMIT batch_limit
  ), deleted AS (
    DELETE FROM "message_events" event
    USING expired
    WHERE event.id = expired.id
    RETURNING event.id
  )
  SELECT count(*)::INTEGER INTO deleted_messages FROM deleted;

  WITH expired AS (
    SELECT quarantine.id
    FROM "webhook_quarantine_events" quarantine
    WHERE quarantine."retentionExpiresAt" <= CURRENT_TIMESTAMP
      AND NOT (
        quarantine."recoveryState" = 'PROCESSING'
        AND quarantine."recoveryLeaseUntil" IS NOT NULL
        AND quarantine."recoveryLeaseUntil" >= CURRENT_TIMESTAMP
      )
    ORDER BY quarantine."retentionExpiresAt", quarantine.id
    FOR UPDATE SKIP LOCKED
    LIMIT batch_limit
  ), deleted AS (
    DELETE FROM "webhook_quarantine_events" quarantine
    USING expired
    WHERE quarantine.id = expired.id
    RETURNING quarantine.id
  )
  SELECT count(*)::INTEGER INTO deleted_quarantine FROM deleted;

  RETURN QUERY SELECT deleted_messages, deleted_quarantine;
END;
$$;

-- Una cuarentena expirada nunca se vuelve a reclamar. Esto acota también
-- WABA desconocidas o rutas que nunca llegan a quedar operacionales.
CREATE OR REPLACE FUNCTION claim_recoverable_webhook_quarantine(
  worker_id TEXT,
  claim_limit INTEGER,
  lease_seconds INTEGER
) RETURNS TABLE(
  "quarantineId" TEXT,
  "encryptedPayload" TEXT,
  "recoveryAttempts" INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF claim_limit < 1 OR claim_limit > 100 OR lease_seconds < 5 OR lease_seconds > 900 THEN
    RAISE EXCEPTION 'invalid quarantine claim parameters';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT quarantine.id
    FROM "webhook_quarantine_events" quarantine
    JOIN "waba_routes" route ON route."wabaId" = quarantine."wabaId"
    JOIN "whatsapp_business_accounts" waba ON waba."wabaId" = route."wabaId"
    JOIN "meta_authorizations" auth ON auth.id = waba."metaAuthorizationId"
    WHERE auth."tenantId" = route."tenantId"
      AND auth.status = 'ACTIVE'
      AND quarantine."retentionExpiresAt" > CURRENT_TIMESTAMP
      AND quarantine."reasonCode" IN ('UNKNOWN_WABA', 'PHONE_MISMATCH_OR_INACTIVE', 'INACTIVE_AUTHORIZATION')
      AND (
        (quarantine."recoveryState" IN ('PENDING', 'RETRY_PENDING') AND quarantine."nextRecoveryAt" <= CURRENT_TIMESTAMP)
        OR (quarantine."recoveryState" = 'PROCESSING' AND quarantine."recoveryLeaseUntil" < CURRENT_TIMESTAMP)
      )
    ORDER BY quarantine."receivedAt", quarantine.id
    FOR UPDATE OF quarantine SKIP LOCKED
    LIMIT claim_limit
  )
  UPDATE "webhook_quarantine_events" quarantine
  SET "recoveryState" = 'PROCESSING',
      "recoveryAttempts" = quarantine."recoveryAttempts" + 1,
      "recoveryLeaseOwner" = worker_id,
      "recoveryLeaseUntil" = CURRENT_TIMESTAMP + make_interval(secs => lease_seconds)
  FROM candidates
  WHERE quarantine.id = candidates.id
  RETURNING quarantine.id, quarantine."encryptedPayload", quarantine."recoveryAttempts";
END;
$$;

REVOKE ALL ON FUNCTION purge_expired_webhook_data(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_expired_webhook_data(INTEGER) TO app_runtime;
