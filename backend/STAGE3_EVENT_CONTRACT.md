# Etapa 3 — contrato de eventos v1

El contrato se guarda en `message_events.normalizedPayload` después del worker. Su versión es `1` y el tipo fuente está en `src/webhook/worker.ts` (`NormalizedWebhookEvent`).

| Campo | Significado |
|---|---|
| `contractVersion` | `1`; consumidores deben rechazar versiones mayores no comprendidas. |
| `internalEventId` | UUID interno estable. |
| `idempotencyKey` | Clave que cada adaptador de Etapa 4 debe usar para deduplicar efectos. |
| `tenantId` | Tenant ya resuelto; nunca proviene libremente del request. |
| `wabaId` | WABA oficial de `entry.id`. |
| `phoneNumberId` | ID interno del número o `null` en eventos administrativos legítimos. |
| `contactWaId` | Contacto cuando puede determinarse sin inventarlo. |
| `externalMessageId` | `wamid` u otro ID externo cuando existe. |
| `message.type` | Tipo reportado por Meta; el contenido permanece en el payload cifrado. |
| `occurredAt` | ISO-8601 derivado del timestamp Meta, o `null`. |
| `direction` | `INBOUND`, `OUTBOUND` o `ADMINISTRATIVE`. |
| `origin` | Enum interno compatible con el esquema. |
| `classification` | Categoría pública de abajo. |
| `automationEligible` | Decisión fail-closed tras consultar pausa humana. |
| `processingState` | `PROCESSED` al publicar el contrato. |

## Categorías

| Categoría | Fuente | Automatización |
|---|---|---|
| `CUSTOMER_INBOUND` | `messages[]` de cliente | Solo si no hay error y la conversación no está pausada. |
| `BUSINESS_APP_ECHO` | `smb_message_echoes.message_echoes[]` | Siempre `false`. `from` es el negocio y `to` es el contacto. |
| `API_OUTBOUND_STATUS` | `messages.statuses[]` | Siempre `false`; cada estado distinto es un evento distinto. |
| `HISTORY_SYNC` | mensajes/chunks `history` | Siempre `false`; dirección se conserva cuando hay datos suficientes. |
| `CONTACT_SYNC` | `smb_app_state_sync.state_sync[]` | Siempre `false`. Un nombre no es identificador estable. |
| `ADMINISTRATIVE_EVENT` | `account_update` | Siempre `false`. Puede no tener número. |
| `UNKNOWN_EVENT` | `field` auténtico no reconocido | Siempre `false`; se conserva para evolución segura. |

Un mensaje manual nunca se interpreta como consulta del cliente. Campos opcionales ausentes producen `null/undefined` o cuarentena cuando impiden una ruta segura; nunca se inventan datos.

## Semántica de entrega para Etapa 4

- Entrega interna: al menos una vez.
- Efecto de negocio: el adaptador debe registrar `idempotencyKey` transaccionalmente.
- El parser no depende de Evolution API, Chatwoot, Typebot o n8n.
- Para acceder a contenido se requiere un componente autorizado capaz de descifrar el payload; no se expone por consultas administrativas ordinarias.
