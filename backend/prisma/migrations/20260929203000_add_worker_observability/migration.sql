-- Observabilidad durable entre los procesos HTTP y worker. No contiene
-- tenant IDs, payloads, teléfonos ni secretos.
CREATE TABLE "webhook_worker_heartbeats" (
  "workerId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" TEXT,
  CONSTRAINT "webhook_worker_heartbeats_pkey" PRIMARY KEY ("workerId")
);
CREATE INDEX "webhook_worker_heartbeats_lastSeenAt_idx" ON "webhook_worker_heartbeats"("lastSeenAt");
GRANT SELECT, INSERT, UPDATE ON "webhook_worker_heartbeats" TO app_runtime;

CREATE OR REPLACE FUNCTION webhook_queue_metrics()
RETURNS TABLE(
  "pending" BIGINT,
  "processing" BIGINT,
  "processed" BIGINT,
  "attentionRequired" BIGINT,
  "oldestPendingAt" TIMESTAMP(3)
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    count(*) FILTER (WHERE "processingState" IN ('PENDING', 'RETRY_PENDING')),
    count(*) FILTER (WHERE "processingState" = 'PROCESSING'),
    count(*) FILTER (WHERE "processingState" = 'PROCESSED'),
    count(*) FILTER (WHERE "processingState" IN ('QUARANTINED', 'MANUAL_INTERVENTION')),
    min("receivedAt") FILTER (WHERE "processingState" IN ('PENDING', 'RETRY_PENDING'))
  FROM "message_events";
$$;
REVOKE ALL ON FUNCTION webhook_queue_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION webhook_queue_metrics() TO app_runtime;
