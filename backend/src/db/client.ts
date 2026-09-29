import { PrismaClient } from '@prisma/client';

// Singleton — evita agotar el pool de conexiones de Postgres con un cliente
// nuevo por request (problema clásico de serverless que la Alternativa B
// evita precisamente por tener un proceso persistente, ver
// ARCHITECTURE_DECISION.md).
let prismaSingleton: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient({
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
