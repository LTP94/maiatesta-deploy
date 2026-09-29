-- PostgreSQL exige confirmar los nuevos valores de enum antes de usarlos en
-- otra sentencia. Por eso esta evolución vive en una migración independiente.
ALTER TYPE "ProcessingState" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "ProcessingState" ADD VALUE IF NOT EXISTS 'RETRY_PENDING';
ALTER TYPE "ProcessingState" ADD VALUE IF NOT EXISTS 'QUARANTINED';
