# Etapa 3 — arquitectura implementada

Fecha: 2026-09-29. Alcance: recepción y procesamiento local de webhooks de WhatsApp Business Platform. No incluye adaptadores de Etapa 4 ni despliegue.

## Fuentes oficiales verificadas

- [Graph API Webhooks — Getting Started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started): verificación GET y cabecera `X-Hub-Signature-256`.
- [Meta — Onboarding business app users](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users): Coexistence, `history`, `smb_app_state_sync`, `smb_message_echoes`, ventana de 24 horas y operaciones de sincronización de una sola ejecución.
- [Meta Postman — Webhook subscriptions](https://www.postman.com/meta/whatsapp-business-platform/folder/ypn8q0n/webhook-subscriptions): suscripción por WABA, no por número.
- [Meta Postman — Webhook payload reference](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference): envelope `object/entry/changes/value`.

Se conserva Graph API `v25.0`: cambiar la versión no era necesario para el contrato local y exige una validación controlada posterior. La página vigente de Coexistence muestra ejemplos posteriores, documentados como posible deriva, no como autorización para cambiar producción.

## Flujo efectivo

```text
Meta
  -> Express raw (1 MiB)
  -> HMAC-SHA256 sobre bytes originales
  -> Zod + recorrido de todos entry[]/changes[]/subeventos
  -> resolve_webhook_route (función SQL restringida)
  -> INSERT idempotente + payload AES-256-GCM en PostgreSQL
  -> HTTP 200 solo después del commit

worker independiente
  -> claim_webhook_events (FOR UPDATE SKIP LOCKED + lease)
  -> descifrado y reclasificación defensiva
  -> política de control humano
  -> contrato normalizado v1
  -> PROCESSED / RETRY_PENDING / QUARANTINED / MANUAL_INTERVENTION
```

`src/app.ts` monta el router raw antes de `express.json()`. El handler no llama a Meta, Redis ni integraciones externas. PostgreSQL es simultáneamente registro durable e inbox autoritativo. Redis continúa siendo requerido por el onboarding de Etapa 2, pero una caída de Redis no puede perder un webhook ni detener este worker.

## Resolución multiempresa

`app_runtime` no puede leer ni escribir directamente `waba_routes`. Las funciones `SECURITY DEFINER` fijan `search_path`, revocan ejecución a `PUBLIC` y exponen operaciones estrechas:

- `resolve_webhook_route(waba, kind, value)`: devuelve solo tenant y fila de número de la ruta solicitada; verifica autorización activa, WABA exacta, número exacto y estado `OPERATIONAL`.
- `upsert_waba_route(waba, tenant)`: solo funciona si el contexto RLS actual coincide y la WABA ya pertenece a ese tenant.
- `store_webhook_quarantine(...)`: registra un evento auténtico no enrutable sin dar acceso de lectura global.
- `claim_webhook_events(...)`: reclama como máximo un evento por tenant y ronda.

Tras resolver, toda lectura/escritura ordinaria usa `TenantScope` y `SET LOCAL app.current_tenant_id`. `message_events` tiene `tenantId` directo y RLS `USING/WITH CHECK`.

## Durabilidad, idempotencia y privacidad

La respuesta exitosa ocurre después de que cada subevento quede persistido o en cuarentena durable. Un fallo de almacenamiento devuelve `503`, haciendo que Meta pueda reintentar.

La clave SHA-256 combina WABA, identidad oficial de ruta y clave del subevento. Los eventos sin ID natural usan JSON canónico. `createMany(..., skipDuplicates)` materializa `INSERT ... ON CONFLICT DO NOTHING`, por lo que la carrera no aborta la transacción. `duplicateCount` es diagnóstico; solo existe una fila/efecto procesable.

El subevento necesario para recuperación se cifra con una clave separada (`META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY`) y retención de 30 días. Campos consultables se minimizan. El contenido no aparece en errores, métricas ni contrato normalizado.

## Estados y recuperación

```text
PENDING -> PROCESSING -> PROCESSED
                 |----> RETRY_PENDING -> PROCESSING
                 |----> QUARANTINED
                 `----> MANUAL_INTERVENTION (5 intentos)
```

Cada claim incrementa intentos y crea un lease de 30 segundos. Un `PROCESSING` con lease vencido es reclamable después de reinicio. El procesador tiene timeout de 10 segundos y backoff exponencial limitado a 60 segundos. El claim por rondas evita que un tenant monopolice el lote.

`src/worker-index.ts` es un proceso independiente (`npm run start:worker`). Los futuros adaptadores se inyectan como `EventProcessor`; deben usar `idempotencyKey` porque la garantía interna es al menos una vez, no exactamente una vez.

## Suscripciones Coexistence

`ensureWabaSubscription` verifica bajo RLS que la WABA tenga autorización activa, descifra su credencial, consulta `/{WABA-ID}/subscribed_apps`, evita POST duplicado y registra el resultado. Las pruebas usan Graph simulado. No se ejecutó ninguna suscripción real ni sync real.

La sincronización de historial/contactos solo se recibe aquí. Iniciarla es una operación posterior, con consentimiento, dentro de las 24 horas documentadas y de una sola ejecución; no se reintenta automáticamente.

## Recursos

No se agrega Kafka, RabbitMQ ni otro servicio. Un proceso HTTP y un worker liviano son adecuados para 2 vCPU/8 GB. PostgreSQL usa consultas indexadas y lotes máximos de 100; el loop vacío espera 500 ms.
