import { describe, expect, it } from 'vitest';
import { classifyChange, computeEligibleForAutomation } from '../../src/webhook/classify.js';
import { webhookEnvelopeSchema } from '../../src/webhook/schema.js';

const ENTRY = { id: '102290129340398', time: 1749416383 };

describe('classifyChange — messages (customer + status)', () => {
  it('clasifica un mensaje entrante real como CUSTOMER/INBOUND, elegible para automatización', () => {
    const parsed = webhookEnvelopeSchema.parse({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: ENTRY.id,
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15550783881', phone_number_id: '106540352242922' },
                contacts: [{ profile: { name: 'Sheena Nelson' }, wa_id: '16505551234' }],
                messages: [{ from: '16505551234', id: 'wamid.AAA', timestamp: '1749416383', type: 'text', text: { body: 'hola' } }],
              },
            },
          ],
        },
      ],
    });

    const events = classifyChange(ENTRY, parsed.entry[0]!.changes[0]!);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      origin: 'CUSTOMER',
      direction: 'INBOUND',
      waMessageId: 'wamid.AAA',
      contactWaId: '16505551234',
      messageType: 'text',
      hasMetaError: false,
      routing: { kind: 'phoneNumberId', value: '106540352242922' },
    });
    expect(computeEligibleForAutomation(events[0]!, false)).toBe(true);
    expect(computeEligibleForAutomation(events[0]!, true)).toBe(false);
  });

  it('un mensaje con errors[] (tipo no soportado) nunca es elegible para automatización', () => {
    const change = {
      field: 'messages',
      value: {
        metadata: { phone_number_id: '106540352242922', display_phone_number: '15550783881' },
        messages: [{ from: '16505551234', id: 'wamid.ERR', errors: [{ code: 131051, title: 'Unsupported message type' }] }],
      },
    };
    const events = classifyChange(ENTRY, change as never);
    expect(events[0]?.hasMetaError).toBe(true);
    expect(computeEligibleForAutomation(events[0]!, false)).toBe(false);
  });

  it('clasifica un status de entrega como STATUS_UPDATE/OUTBOUND, nunca elegible', () => {
    const change = {
      field: 'messages',
      value: {
        metadata: { phone_number_id: '106540352242922' },
        statuses: [{ id: 'wamid.BBB', status: 'delivered', recipient_id: '16505551234' }],
      },
    };
    const events = classifyChange(ENTRY, change as never);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ origin: 'STATUS_UPDATE', direction: 'OUTBOUND', statusValue: 'delivered' });
    expect(computeEligibleForAutomation(events[0]!, false)).toBe(false);
  });

  it('dos statuses distintos (delivered, luego read) del MISMO wamid producen metaEventId distintos', () => {
    const delivered = classifyChange(ENTRY, {
      field: 'messages',
      value: { metadata: { phone_number_id: 'p1' }, statuses: [{ id: 'wamid.CCC', status: 'delivered' }] },
    } as never)[0]!;
    const read = classifyChange(ENTRY, {
      field: 'messages',
      value: { metadata: { phone_number_id: 'p1' }, statuses: [{ id: 'wamid.CCC', status: 'read' }] },
    } as never)[0]!;
    expect(delivered.metaEventId).not.toBe(read.metaEventId);
  });

  it('el MISMO status reenviado (retry de Meta) produce el mismo metaEventId — deduplicable', () => {
    const a = classifyChange(ENTRY, {
      field: 'messages',
      value: { metadata: { phone_number_id: 'p1' }, statuses: [{ id: 'wamid.DDD', status: 'sent' }] },
    } as never)[0]!;
    const b = classifyChange(ENTRY, {
      field: 'messages',
      value: { metadata: { phone_number_id: 'p1' }, statuses: [{ id: 'wamid.DDD', status: 'sent' }] },
    } as never)[0]!;
    expect(a.metaEventId).toBe(b.metaEventId);
  });
});

describe('classifyChange — smb_message_echoes (mensajes enviados manualmente)', () => {
  it('clasifica un eco como BUSINESS_APP_ECHO/OUTBOUND, nunca elegible para automatización', () => {
    const change = {
      field: 'smb_message_echoes',
      value: {
        metadata: { phone_number_id: '106540352242922' },
        message_echoes: [{ from: '15550783881', to: '16505551234', id: 'wamid.ECHO1', type: 'text' }],
      },
    };
    const events = classifyChange(ENTRY, change as never);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ origin: 'BUSINESS_APP_ECHO', direction: 'OUTBOUND', contactWaId: '16505551234' });
    expect(computeEligibleForAutomation(events[0]!, false)).toBe(false);
  });
});

describe('classifyChange — smb_app_state_sync (contactos)', () => {
  it('clasifica un contacto sincronizado como CONTACT_SYNC/ADMINISTRATIVE', () => {
    const change = {
      field: 'smb_app_state_sync',
      value: {
        metadata: { phone_number_id: '106540352242922' },
        state_sync: [{ type: 'contact', contact: { full_name: 'Juan', phone_number: '16505550000' }, action: 'add' }],
      },
    };
    const events = classifyChange(ENTRY, change as never);
    expect(events[0]).toMatchObject({ origin: 'CONTACT_SYNC', direction: 'ADMINISTRATIVE', contactWaId: '16505550000' });
    expect(computeEligibleForAutomation(events[0]!, false)).toBe(false);
  });
});

describe('classifyChange — history (aprobado y rechazado)', () => {
  it('aplana cada mensaje histórico en su propio HISTORY_SYNC, preservando history_context.status', () => {
    const change = {
      field: 'history',
      value: {
        metadata: { phone_number_id: '106540352242922', display_phone_number: '15550783881' },
        history: [
          {
            metadata: { phase: 0, chunk_order: 1, progress: 55 },
            threads: [
              {
                id: '16505551234',
                messages: [
                  { from: '15550783881', id: 'wamid.H1', type: 'text', history_context: { status: 'READ' } },
                  { from: '16505551234', id: 'wamid.H2', type: 'text', history_context: { status: 'READ' } },
                ],
              },
            ],
          },
        ],
      },
    };
    const events = classifyChange(ENTRY, change as never);
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.origin === 'HISTORY_SYNC')).toBe(true);
    expect(events[0]).toMatchObject({ waMessageId: 'wamid.H1', contactWaId: '16505551234', statusValue: 'READ' });
    expect(events.map((event) => event.direction)).toEqual(['OUTBOUND', 'INBOUND']);
    expect(computeEligibleForAutomation(events[0]!, false)).toBe(false);
  });

  it('clasifica el historial rechazado (error 2593109) como un único evento HISTORY_SYNC con hasMetaError', () => {
    const change = {
      field: 'history',
      value: {
        history: [
          {
            errors: [
              {
                code: 2593109,
                title: 'History sync is turned off by the business from the WhatsApp Business App',
              },
            ],
          },
        ],
      },
    };
    const events = classifyChange(ENTRY, change as never);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ origin: 'HISTORY_SYNC', messageType: 'declined', hasMetaError: true });
  });
});

describe('classifyChange — account_update (sin metadata, enruta por phone_number)', () => {
  it('enruta por displayPhoneNumber, no por phoneNumberId, porque el payload real no trae phone_number_id', () => {
    const change = {
      field: 'account_update',
      value: {
        phone_number: '15550783881',
        event: 'ACCOUNT_DISCONNECTED',
        disconnection_info: { reason: 'PRIMARY_INACTIVITY', initiated_by: 'SYSTEM' },
      },
    };
    const events = classifyChange(ENTRY, change as never);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ origin: 'ACCOUNT_EVENT', direction: 'ADMINISTRATIVE', messageType: 'ACCOUNT_DISCONNECTED' });
    expect(events[0]?.routing).toEqual({ kind: 'displayPhoneNumber', value: '15550783881' });
    expect(computeEligibleForAutomation(events[0]!, false)).toBe(false);
  });

  it('dos account_update con el mismo event+phone_number pero distinto entry.time producen metaEventId distintos', () => {
    const value = { phone_number: '15550783881', event: 'ACCOUNT_DISCONNECTED' };
    const first = classifyChange({ id: 'waba-1', time: 1000 }, { field: 'account_update', value } as never)[0]!;
    const second = classifyChange({ id: 'waba-1', time: 2000 }, { field: 'account_update', value } as never)[0]!;
    expect(first.metaEventId).not.toBe(second.metaEventId);
  });
});

describe('classifyChange — campo desconocido (UNCLASSIFIED, nunca se descarta)', () => {
  it('un field que este backend no reconoce todavía se clasifica como UNCLASSIFIED, nunca se pierde', () => {
    const change = { field: 'message_template_status_update', value: { some_future_field: true } };
    const events = classifyChange(ENTRY, change as never);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ origin: 'UNCLASSIFIED', messageType: 'message_template_status_update' });
    expect(computeEligibleForAutomation(events[0]!, false)).toBe(false);
  });
});

describe('webhookEnvelopeSchema — tolerante a campos ausentes, estricto en lo indispensable', () => {
  it('rechaza un object distinto de whatsapp_business_account', () => {
    const result = webhookEnvelopeSchema.safeParse({ object: 'page', entry: [] });
    expect(result.success).toBe(false);
  });

  it('rechaza una entrada sin id (no se puede enrutar sin WABA id)', () => {
    const result = webhookEnvelopeSchema.safeParse({ object: 'whatsapp_business_account', entry: [{ changes: [] }] });
    expect(result.success).toBe(false);
  });

  it('acepta un envelope con campos opcionales completamente ausentes', () => {
    const result = webhookEnvelopeSchema.safeParse({
      object: 'whatsapp_business_account',
      entry: [{ id: 'waba-min', changes: [{ field: 'messages', value: {} }] }],
    });
    expect(result.success).toBe(true);
  });
});
