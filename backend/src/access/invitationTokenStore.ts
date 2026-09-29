import type { Redis } from 'ioredis';
import { InvitationTokenError, verifyInvitationToken, type InvitationTokenPayload } from './invitationToken.js';

/**
 * Consumo de un solo uso para tokens de invitación (condiciones 4 y 7 de la
 * Etapa 2: "no pueden utilizarse más de una vez para iniciar conexiones
 * independientes" / "no permiten reutilizar una autorización anterior").
 *
 * `verifyInvitationToken` por sí solo (invitationToken.ts) es un primitivo
 * puro sin estado — puede verificar la firma de un token cien veces sin
 * problema, lo cual es correcto para verificación, pero NO alcanza para
 * "de un solo uso": ese es un hecho sobre el TIEMPO (¿ya se usó este jti
 * antes?), no sobre la firma. Redis es el estado compartido que responde
 * esa pregunta entre invocaciones/procesos distintos.
 *
 * `SET key value NX EX ttl` es atómico en Redis — dos peticiones
 * concurrentes con el MISMO token (el escenario real a prevenir: alguien
 * reenvía la misma petición dos veces, o un token filtrado se usa dos
 * veces en paralelo) nunca pueden marcar "consumido" ambas con éxito; solo
 * una gana la carrera, la otra ve `null` y falla.
 */

const KEY_PREFIX = 'invitation-token-consumed:';

function keyFor(jti: string): string {
  return `${KEY_PREFIX}${jti}`;
}

/**
 * Marca un `jti` como consumido con un TTL = tiempo restante hasta la
 * expiración del token (nunca más largo que eso — no tiene sentido recordar
 * un jti después de que su token ya expiró por sí solo). Devuelve `true` si
 * este era el primer consumo, `false` si ya estaba consumido.
 */
export async function tryConsumeJti(redis: Redis, jti: string, ttlSeconds: number): Promise<boolean> {
  if (ttlSeconds <= 0) {
    return false; // un token ya vencido nunca se marca como "recién consumido"
  }
  const result = await redis.set(keyFor(jti), '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export async function isJtiConsumed(redis: Redis, jti: string): Promise<boolean> {
  const value = await redis.get(keyFor(jti));
  return value !== null;
}

/**
 * Verifica Y consume un token de invitación en una sola operación — el
 * punto de entrada que debe usar `onboarding/start` (Etapa 2). Nunca deja
 * una ventana entre "verificar" y "consumir" en la que el mismo token
 * pudiera usarse dos veces desde el punto de vista del llamador.
 */
export async function redeemInvitationToken(
  params: { token: string; secret: string; redis: Redis; now?: number },
): Promise<InvitationTokenPayload> {
  const payload = verifyInvitationToken(params.token, params.secret, params.now ?? Date.now());

  const nowSeconds = Math.floor((params.now ?? Date.now()) / 1000);
  const remainingTtl = payload.expiresAt - nowSeconds;

  const consumed = await tryConsumeJti(params.redis, payload.jti, remainingTtl);
  if (!consumed) {
    throw new InvitationTokenError('Token has already been used.');
  }

  return payload;
}
