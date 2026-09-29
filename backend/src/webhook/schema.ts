import { z } from 'zod';

/**
 * Validación de estructura del payload de webhook — deliberadamente
 * PERMISIVA en los campos internos: cada tipo de sub-evento usa
 * `.passthrough()` y casi todos los campos son `.optional()`, siguiendo la
 * instrucción explícita de la Etapa 3 ("no presupongas que todos los
 * eventos tienen la misma estructura ni que los campos opcionales siempre
 * están presentes"). Lo único estrictamente obligatorio es lo que esta
 * propia validación necesita para poder enrutar y clasificar con
 * seguridad: `object`, `entry[].id` (WABA id), y `changes[].field`.
 *
 * Formas verificadas contra documentación oficial vigente (fetch directo,
 * no memoria) — ver docs/WEBHOOK_EVENT_CONTRACT.md para las citas
 * completas: `messages`/`statuses` (Cloud API webhooks payload examples),
 * `smb_message_echoes` -> `message_echoes[]`, `smb_app_state_sync` ->
 * `state_sync[]`, `history` -> `history[]` (con la variante "declined" sin
 * `threads`, solo `errors[]`), y `account_update` (`value.phone_number`,
 * SIN el envoltorio `metadata` que sí tienen los demás campos).
 */

const metaErrorSchema = z
  .object({
    code: z.union([z.number(), z.string()]).optional(),
    title: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

const metadataSchema = z
  .object({
    display_phone_number: z.string().optional(),
    phone_number_id: z.string().optional(),
  })
  .passthrough();

const contactSchema = z
  .object({
    profile: z.object({ name: z.string().optional() }).passthrough().optional(),
    wa_id: z.string().optional(),
  })
  .passthrough();

const inboundMessageSchema = z
  .object({
    from: z.string().optional(),
    id: z.string().optional(),
    timestamp: z.string().optional(),
    type: z.string().optional(),
    errors: z.array(metaErrorSchema).optional(),
  })
  .passthrough();

const statusSchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    timestamp: z.string().optional(),
    recipient_id: z.string().optional(),
    errors: z.array(metaErrorSchema).optional(),
  })
  .passthrough();

const messageEchoSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    id: z.string().optional(),
    timestamp: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

const stateSyncItemSchema = z
  .object({
    type: z.string().optional(),
    contact: z
      .object({
        full_name: z.string().optional(),
        first_name: z.string().optional(),
        phone_number: z.string().optional(),
      })
      .passthrough()
      .optional(),
    action: z.string().optional(),
    metadata: z.object({ timestamp: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();

const historyMessageSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    id: z.string().optional(),
    timestamp: z.string().optional(),
    type: z.string().optional(),
    history_context: z.object({ status: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();

const historyThreadSchema = z
  .object({
    id: z.string().optional(),
    messages: z.array(historyMessageSchema).optional(),
  })
  .passthrough();

const historyChunkSchema = z
  .object({
    metadata: z
      .object({
        phase: z.union([z.number(), z.string()]).optional(),
        chunk_order: z.union([z.number(), z.string()]).optional(),
        progress: z.union([z.number(), z.string()]).optional(),
      })
      .passthrough()
      .optional(),
    threads: z.array(historyThreadSchema).optional(),
    // Forma "declined" (history sync rechazado por el cliente desde la app):
    // sin metadata/threads, solo errors[] con code 2593109.
    errors: z.array(metaErrorSchema).optional(),
  })
  .passthrough();

const changeValueSchema = z
  .object({
    messaging_product: z.string().optional(),
    metadata: metadataSchema.optional(),
    contacts: z.array(contactSchema).optional(),
    messages: z.array(inboundMessageSchema).optional(),
    statuses: z.array(statusSchema).optional(),
    errors: z.array(metaErrorSchema).optional(),
    message_echoes: z.array(messageEchoSchema).optional(),
    state_sync: z.array(stateSyncItemSchema).optional(),
    history: z.array(historyChunkSchema).optional(),
    // account_update — SIN metadata, campos propios:
    phone_number: z.string().optional(),
    event: z.string().optional(),
    disconnection_info: z
      .object({ reason: z.string().optional(), initiated_by: z.string().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

const changeSchema = z.object({
  field: z.string().min(1),
  value: changeValueSchema,
});

const entrySchema = z
  .object({
    id: z.string().min(1), // WABA id — clave de enrutamiento, ver src/webhook/routing.ts
    time: z.union([z.number(), z.string()]).optional(),
    changes: z.array(changeSchema).min(1),
  })
  .passthrough();

export const webhookEnvelopeSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(entrySchema).min(1),
});

export type WebhookEnvelope = z.infer<typeof webhookEnvelopeSchema>;
export type WebhookEntry = z.infer<typeof entrySchema>;
export type WebhookChange = z.infer<typeof changeSchema>;
export type ChangeValue = z.infer<typeof changeValueSchema>;
