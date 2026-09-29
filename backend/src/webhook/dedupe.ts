import { createHash } from 'node:crypto';

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(',')}}`;
}

/**
 * Clave de deduplicación persistente (sección 5 del pedido de la Etapa 3:
 * "considerando el identificador de la cuenta, el número, el mensaje y el
 * tipo de evento cuando corresponda"). Se combina con `phoneNumberId`
 * (interno) en la restricción `@@unique([phoneNumberId, metaEventId])` de
 * `message_events` — la deduplicación real la aplica Postgres, no el
 * proceso Node (que puede reiniciarse, tener varias réplicas, etc.).
 *
 * Dos formas, elegidas para que "los diferentes estados de un mismo mensaje
 * puedan actualizarse sin confundirse con eventos duplicados" (sección 5):
 *
 *  - Con `waMessageId` (mensajes, ecos, mensajes históricos): la clave es
 *    `{kind}:{waMessageId}` — o `{kind}:{waMessageId}:{subState}` cuando el
 *    mismo id de mensaje puede repetirse con un estado distinto (status de
 *    entrega: sent/delivered/read/failed). Sin `subState`, un mismo
 *    `waMessageId` reenviado por Meta (retry del payload completo) colisiona
 *    con la fila ya existente — exactamente la deduplicación deseada. CON
 *    `subState`, cada transición de estado nueva es una fila nueva, pero la
 *    MISMA transición reenviada vuelve a colisionar.
 *
 *  - Sin `waMessageId` (sincronización de contactos, historial rechazado,
 *    eventos de cuenta): no hay un id natural que Meta provea, así que la
 *    clave es un hash determinista del sub-evento completo — dos entregas
 *    idénticas producen el mismo hash (deduplicadas); dos eventos
 *    legítimamente distintos (contacto distinto, timestamp distinto) casi
 *    con certeza no colisionan.
 */
export function computeMetaEventId(kind: string, params: { waMessageId?: string; subState?: string; fallbackPayload?: unknown }): string {
  if (params.waMessageId) {
    return params.subState ? `${kind}:${params.waMessageId}:${params.subState}` : `${kind}:${params.waMessageId}`;
  }
  const canonical = canonicalize(params.fallbackPayload ?? {});
  const hash = createHash('sha256').update(canonical).digest('hex');
  return `${kind}:${hash}`;
}

/** Hash del payload crudo de UN sub-evento — nunca se persiste el contenido en sí (rawPayloadHash en message_events). */
export function hashSubEventPayload(subEvent: unknown): string {
  return createHash('sha256').update(canonicalize(subEvent ?? {})).digest('hex');
}


/** Clave global: impide que un evento idéntico se duplique incluso con varios procesos. */
export function computeIdempotencyKey(wabaId: string, routingIdentity: string, metaEventId: string): string {
  return createHash('sha256').update(`${wabaId}\u0000${routingIdentity}\u0000${metaEventId}`).digest('hex');
}
