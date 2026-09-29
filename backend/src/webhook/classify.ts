import { MessageDirection, MessageOrigin } from '@prisma/client';
import type { WebhookChange, WebhookEntry } from './schema.js';
import { computeMetaEventId, hashSubEventPayload } from './dedupe.js';

/**
 * Contrato de eventos de la Etapa 3 — lo que los adaptadores de la Etapa 4
 * (Evolution/Chatwoot/Typebot/n8n) consumirán sin tener que reinterpretar
 * el payload crudo de Meta. Ver docs/WEBHOOK_EVENT_CONTRACT.md.
 *
 * `routing` es deliberadamente una unión discriminada: la mayoría de los
 * sub-eventos se resuelven por `phone_number_id` (`value.metadata`), pero
 * `account_update` únicamente trae `value.phone_number` (el número visible,
 * sin id, sin envoltorio metadata) — nunca se asume que ambos casos usan el
 * mismo campo.
 */
export type EventRouting = { kind: 'phoneNumberId'; value: string } | { kind: 'displayPhoneNumber'; value: string } | { kind: 'unroutable' };

export type ClassifiedEvent = {
  origin: MessageOrigin;
  direction: MessageDirection;
  waMessageId?: string;
  contactWaId?: string;
  messageType?: string;
  statusValue?: string;
  hasMetaError: boolean;
  metaEventId: string;
  rawPayloadHash: string;
  routing: EventRouting;
  category: EventCategory;
  eventTimestamp?: Date;
};

export type EventCategory =
  | 'CUSTOMER_INBOUND'
  | 'BUSINESS_APP_ECHO'
  | 'API_OUTBOUND_STATUS'
  | 'HISTORY_SYNC'
  | 'CONTACT_SYNC'
  | 'ADMINISTRATIVE_EVENT'
  | 'UNKNOWN_EVENT';

function parseTimestamp(value: string | number | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  const result = new Date(numeric * 1000);
  return Number.isNaN(result.getTime()) ? undefined : result;
}

function routingFromMetadata(value: WebhookChange['value']): EventRouting {
  const phoneNumberId = value.metadata?.phone_number_id;
  return phoneNumberId ? { kind: 'phoneNumberId', value: phoneNumberId } : { kind: 'unroutable' };
}

function historyDirection(from: string | undefined, displayPhoneNumber: string | undefined): MessageDirection {
  if (!from || !displayPhoneNumber) return MessageDirection.ADMINISTRATIVE;
  const normalizedFrom = from.replace(/\D/g, '');
  const normalizedBusiness = displayPhoneNumber.replace(/\D/g, '');
  return normalizedFrom === normalizedBusiness ? MessageDirection.OUTBOUND : MessageDirection.INBOUND;
}

/**
 * Clasifica UN `changes[]` del webhook en cero o más eventos canónicos —
 * cada elemento de cada array (`messages[]`, `statuses[]`, etc.) se
 * convierte en su propio `ClassifiedEvent`, nunca se agrupa el chunk
 * entero como una sola fila (necesario para que la deduplicación por
 * mensaje individual funcione).
 *
 * Cualquier `field` no reconocido cae en `UNCLASSIFIED` — nunca se
 * descarta silenciosamente (sección 4: "no presupongas que todos los
 * eventos tienen la misma estructura"), nunca es elegible para
 * automatización.
 */
export function classifyChange(entry: Pick<WebhookEntry, 'id' | 'time'>, change: WebhookChange): ClassifiedEvent[] {
  const { field, value } = change;
  const routing = routingFromMetadata(value);

  switch (field) {
    case 'messages': {
      const events: ClassifiedEvent[] = [];

      for (const message of value.messages ?? []) {
        const hasMetaError = Boolean(message.errors?.length);
        events.push({
          origin: MessageOrigin.CUSTOMER,
          direction: MessageDirection.INBOUND,
          waMessageId: message.id,
          contactWaId: message.from,
          messageType: message.type,
          hasMetaError,
          rawPayloadHash: hashSubEventPayload(message),
          metaEventId: message.id ? computeMetaEventId('msg', { waMessageId: message.id }) : computeMetaEventId('msg', { fallbackPayload: message }),
          routing,
          category: 'CUSTOMER_INBOUND',
          eventTimestamp: parseTimestamp(message.timestamp),
        });
      }

      for (const status of value.statuses ?? []) {
        const hasMetaError = Boolean(status.errors?.length);
        events.push({
          origin: MessageOrigin.STATUS_UPDATE,
          direction: MessageDirection.OUTBOUND,
          waMessageId: status.id,
          contactWaId: status.recipient_id,
          statusValue: status.status,
          hasMetaError,
          rawPayloadHash: hashSubEventPayload(status),
          metaEventId: status.id
            ? computeMetaEventId('status', { waMessageId: status.id, subState: status.status })
            : computeMetaEventId('status', { fallbackPayload: status }),
          routing,
          category: 'API_OUTBOUND_STATUS',
          eventTimestamp: parseTimestamp(status.timestamp),
        });
      }

      return events;
    }

    case 'smb_message_echoes': {
      return (value.message_echoes ?? []).map((echo) => ({
        origin: MessageOrigin.BUSINESS_APP_ECHO,
        direction: MessageDirection.OUTBOUND,
        waMessageId: echo.id,
        contactWaId: echo.to,
        messageType: echo.type,
        hasMetaError: false,
        rawPayloadHash: hashSubEventPayload(echo),
        metaEventId: echo.id ? computeMetaEventId('echo', { waMessageId: echo.id }) : computeMetaEventId('echo', { fallbackPayload: echo }),
        routing,
        category: 'BUSINESS_APP_ECHO' as const,
        eventTimestamp: parseTimestamp(echo.timestamp),
      }));
    }

    case 'smb_app_state_sync': {
      return (value.state_sync ?? []).map((item) => ({
        origin: MessageOrigin.CONTACT_SYNC,
        direction: MessageDirection.ADMINISTRATIVE,
        contactWaId: item.contact?.phone_number,
        messageType: item.type,
        hasMetaError: false,
        rawPayloadHash: hashSubEventPayload(item),
        metaEventId: computeMetaEventId('contact', { fallbackPayload: item }),
        routing,
        category: 'CONTACT_SYNC' as const,
        eventTimestamp: parseTimestamp(item.metadata?.timestamp),
      }));
    }

    case 'history': {
      const events: ClassifiedEvent[] = [];

      for (const chunk of value.history ?? []) {
        if (chunk.errors?.length) {
          // Forma "declined" — el cliente desactivó el envío de historial
          // desde la app. Un evento informativo por chunk, no por mensaje.
          events.push({
            origin: MessageOrigin.HISTORY_SYNC,
            direction: MessageDirection.ADMINISTRATIVE,
            messageType: 'declined',
            hasMetaError: true,
            rawPayloadHash: hashSubEventPayload(chunk),
            metaEventId: computeMetaEventId('history-declined', { fallbackPayload: chunk.errors }),
            routing,
            category: 'HISTORY_SYNC',
          });
          continue;
        }

        for (const thread of chunk.threads ?? []) {
          for (const message of thread.messages ?? []) {
            events.push({
              origin: MessageOrigin.HISTORY_SYNC,
              direction: historyDirection(message.from, value.metadata?.display_phone_number),
              waMessageId: message.id,
              contactWaId: thread.id,
              messageType: message.type,
              statusValue: message.history_context?.status,
              hasMetaError: false,
              rawPayloadHash: hashSubEventPayload(message),
              metaEventId: message.id
                ? computeMetaEventId('history', { waMessageId: message.id, subState: message.history_context?.status })
                : computeMetaEventId('history', { fallbackPayload: message }),
              routing,
              category: 'HISTORY_SYNC',
              eventTimestamp: parseTimestamp(message.timestamp),
            });
          }
        }
      }

      return events;
    }

    case 'account_update': {
      // Único campo sin `value.metadata` — el número viene en
      // `value.phone_number` (visible, no phone_number_id). Se incluye
      // `entry.id`/`entry.time` en el hash de respaldo porque dos eventos
      // de cuenta distintos (p. ej. desconectar y luego reconectar) pueden,
      // de otro modo, compartir exactamente el mismo `event`+`phone_number`.
      const displayPhoneNumber = value.phone_number;
      return [
        {
          origin: MessageOrigin.ACCOUNT_EVENT,
          direction: MessageDirection.ADMINISTRATIVE,
          messageType: value.event,
          hasMetaError: false,
          rawPayloadHash: hashSubEventPayload(value),
          metaEventId: computeMetaEventId('account', { fallbackPayload: { entryId: entry.id, entryTime: entry.time, value } }),
          routing: displayPhoneNumber ? { kind: 'displayPhoneNumber', value: displayPhoneNumber } : { kind: 'unroutable' },
          category: 'ADMINISTRATIVE_EVENT',
          eventTimestamp: parseTimestamp(entry.time),
        },
      ];
    }

    default: {
      // Campo que este backend todavía no reconoce — se persiste igual
      // (hash únicamente), nunca se descarta, nunca dispara automatización.
      return [
        {
          origin: MessageOrigin.UNCLASSIFIED,
          direction: MessageDirection.ADMINISTRATIVE,
          messageType: field,
          hasMetaError: false,
          rawPayloadHash: hashSubEventPayload(value),
          metaEventId: computeMetaEventId('unclassified', { fallbackPayload: { entryId: entry.id, entryTime: entry.time, field, value } }),
          routing,
          category: 'UNKNOWN_EVENT',
          eventTimestamp: parseTimestamp(entry.time),
        },
      ];
    }
  }
}

/** Solo un mensaje real de cliente, sin error de Meta, puede llegar a ser elegible — todo lo demás es false por construcción, nunca configurable. */
export function computeEligibleForAutomation(event: Pick<ClassifiedEvent, 'origin' | 'hasMetaError'>, automationPaused: boolean): boolean {
  if (event.origin !== MessageOrigin.CUSTOMER) return false;
  if (event.hasMetaError) return false;
  return !automationPaused;
}
