import { Redis } from 'ioredis';
import { getRedisUrl } from '../config/env.js';

// Singleton — mismo motivo que src/db/client.ts: un proceso persistente
// (Alternativa B) no debe abrir una conexión Redis nueva por request.
let redisSingleton: Redis | undefined;

export function getRedisClient(): Redis {
  if (!redisSingleton) {
    redisSingleton = new Redis(getRedisUrl(), { maxRetriesPerRequest: 1 });
  }
  return redisSingleton;
}

export async function disconnectRedis(): Promise<void> {
  if (redisSingleton) {
    redisSingleton.disconnect();
    redisSingleton = undefined;
  }
}
