import { PrismaClient } from '@prisma/client';
import { getRuntimeDatabaseUrl } from '../config/env.js';

// Singleton — evita agotar el pool de conexiones de Postgres con un cliente
// nuevo por request (problema clásico de serverless que la Alternativa B
// evita precisamente por tener un proceso persistente, ver
// ARCHITECTURE_DECISION.md).
//
// Conecta con RUNTIME_DATABASE_URL (rol app_runtime), NUNCA con
// DATABASE_URL (rol dueño) — ese rol es exclusivo de `prisma migrate` y de
// scripts/bootstrap-db-roles.sh. Esto es lo que hace que Row-Level Security
// (prisma/migrations/20260929180000_enable_row_level_security) realmente
// se aplique: un dueño de tabla o un superusuario ignora RLS por defecto,
// así que conectar con el rol equivocado silenciaría toda la protección
// sin ningún error visible.
let prismaSingleton: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient({
      datasources: { db: { url: getRuntimeDatabaseUrl() } },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prismaSingleton;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = undefined;
  }
}
