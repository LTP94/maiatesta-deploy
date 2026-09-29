-- Recupera automáticamente eventos auténticos que llegaron después de la
-- autorización de Meta pero antes de que la ruta/número fuese operacional.
ALTER TABLE "webhook_quarantine_events"
  ADD COLUMN "recoveryState" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "recoveryAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextRecoveryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "recoveryLeaseOwner" TEXT,
  ADD COLUMN "recoveryLeaseUntil" TIMESTAMP(3),
  ADD COLUMN "lastRecoveryError" TEXT,
  ADD COLUMN "recoveredAt" TIMESTAMP(3),
  ADD COLUMN "recoveredEventCount" INTEGER;

CREATE INDEX "webhook_quarantine_events_recoveryState_nextRecoveryAt_idx"
  ON "webhook_quarantine_events"("recoveryState", "nextRecoveryAt");

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

-- Una ruta todavía no preparada no es un fallo de procesamiento: se libera el
-- lease sin consumir el presupuesto de cinco errores y se vuelve a intentar.
CREATE OR REPLACE FUNCTION defer_webhook_quarantine_recovery(
  quarantine_id TEXT,
  worker_id TEXT,
  error_code TEXT,
  next_attempt_at TIMESTAMP(3)
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE "webhook_quarantine_events"
  SET "recoveryState" = 'RETRY_PENDING',
      "recoveryAttempts" = greatest("recoveryAttempts" - 1, 0),
      "nextRecoveryAt" = next_attempt_at,
      "recoveryLeaseOwner" = NULL,
      "recoveryLeaseUntil" = NULL,
      "lastRecoveryError" = left(error_code, 120)
  WHERE id = quarantine_id
    AND "recoveryState" = 'PROCESSING'
    AND "recoveryLeaseOwner" = worker_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION complete_webhook_quarantine_recovery(
  quarantine_id TEXT,
  worker_id TEXT,
  recovered_count INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE "webhook_quarantine_events"
  SET "recoveryState" = 'RECOVERED',
      "recoveredAt" = CURRENT_TIMESTAMP,
      "recoveredEventCount" = recovered_count,
      "recoveryLeaseOwner" = NULL,
      "recoveryLeaseUntil" = NULL,
      "lastRecoveryError" = NULL
  WHERE id = quarantine_id
    AND "recoveryState" = 'PROCESSING'
    AND "recoveryLeaseOwner" = worker_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION retry_webhook_quarantine_recovery(
  quarantine_id TEXT,
  worker_id TEXT,
  error_code TEXT,
  next_attempt_at TIMESTAMP(3)
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE "webhook_quarantine_events"
  SET "recoveryState" = CASE WHEN "recoveryAttempts" >= 5 THEN 'MANUAL_INTERVENTION' ELSE 'RETRY_PENDING' END,
      "nextRecoveryAt" = next_attempt_at,
      "recoveryLeaseOwner" = NULL,
      "recoveryLeaseUntil" = NULL,
      "lastRecoveryError" = left(error_code, 120)
  WHERE id = quarantine_id
    AND "recoveryState" = 'PROCESSING'
    AND "recoveryLeaseOwner" = worker_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION claim_recoverable_webhook_quarantine(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION complete_webhook_quarantine_recovery(TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION retry_webhook_quarantine_recovery(TEXT, TEXT, TEXT, TIMESTAMP(3)) FROM PUBLIC;
REVOKE ALL ON FUNCTION defer_webhook_quarantine_recovery(TEXT, TEXT, TEXT, TIMESTAMP(3)) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_recoverable_webhook_quarantine(TEXT, INTEGER, INTEGER) TO app_runtime;
GRANT EXECUTE ON FUNCTION complete_webhook_quarantine_recovery(TEXT, TEXT, INTEGER) TO app_runtime;
GRANT EXECUTE ON FUNCTION retry_webhook_quarantine_recovery(TEXT, TEXT, TEXT, TIMESTAMP(3)) TO app_runtime;
GRANT EXECUTE ON FUNCTION defer_webhook_quarantine_recovery(TEXT, TEXT, TEXT, TIMESTAMP(3)) TO app_runtime;
