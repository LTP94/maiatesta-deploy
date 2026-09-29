# Etapa 3 — auditoría de recuperación

Fecha de la auditoría inicial: 2026-09-29. Esta auditoría describe el estado encontrado antes de continuar el trabajo interrumpido. No implica que la Etapa 3 esté terminada.

## Estado de Git encontrado

- Rama activa: `feat/whatsapp-coexistence-backend`.
- `HEAD`: `75e9412` (`feat(whatsapp-backend): Etapa 2 — endpoints de onboarding Coexistence`).
- Diferencia confirmada entre `75e9412` y `HEAD`: ninguna; no había commits posteriores de Etapa 3.
- Índice de Git: sin cambios preparados.
- Cambios locales preservados:
  - Modificados: `prisma/schema.prisma`, `src/tenancy/isolation.ts`.
  - Nuevos: migración `20260929184009_add_webhook_events_and_routing`, directorio `src/webhook/`, `tests/unit/webhookClassify.test.ts`, `tests/unit/webhookSignature.test.ts`.
- No se utilizó `git reset`, no se eliminaron archivos y no se descartó trabajo previo.

## Migraciones existentes

| Migración | Estado | Alcance |
|---|---|---|
| `20260929173237_init` | IMPLEMENTED | Esquema base multiempresa. |
| `20260929180000_enable_row_level_security` | IMPLEMENTED | Rol `app_runtime`, RLS y fail-closed. |
| `20260929180006_add_meta_v4_account_fields` | IMPLEMENTED | Campos de compatibilidad Coexistence v4. |
| `20260929184009_add_webhook_events_and_routing` | PARTIAL | Amplía `message_events`, crea estado de conversación y ruta WABA→tenant, pero no cubre aún la máquina de estados, recuperación y persistencia mínima requeridas por la misión completa. |

`prisma migrate status` contra PostgreSQL local aislado (`localhost:55563`) confirmó cuatro migraciones y esquema actualizado. No se ejecutó ninguna migración contra producción.

## Inventario de trabajo de Etapa 3 encontrado

| Componente | Clasificación inicial | Evidencia y limitación encontrada |
|---|---|---|
| Esquema de envelope de Meta | PARTIAL | `src/webhook/schema.ts` recorre estructuras flexibles y conoce `messages`, `statuses`, `smb_message_echoes`, `smb_app_state_sync`, `history` y `account_update`; falta validación contextual por tipo y contratos completos de cuarentena. |
| Firma `X-Hub-Signature-256` | IMPLEMENTED | `src/webhook/signature.ts` usa HMAC-SHA256 sobre `Buffer` y `timingSafeEqual`; todavía no estaba conectado a un endpoint HTTP con raw body. |
| Webhook GET de verificación | MISSING | No existía router ni contrato HTTP. |
| Webhook POST | MISSING | No existía router, receptor, límite específico, manejo de JSON inválido ni respuesta durable. |
| Recorrido de múltiples entradas/cambios | PARTIAL | `classifyChange` procesa un cambio; no existía receptor que recorriera todos los `entry[]` y `changes[]`. |
| Clasificación/normalización | PARTIAL | `classify.ts` distingue inbound, eco manual, status, historial, contactos, cuenta y desconocido; faltan timestamps normalizados, versión del contrato y persistencia recuperable del resultado. |
| Prevención de bucles | PARTIAL | `computeEligibleForAutomation` hace fail-closed y contempla pausa humana; no existía worker que la aplicara de forma durable. |
| Resolución WABA→tenant | PARTIAL | `WabaRoute` y `resolveTenantIdForWaba` existen; el rol runtime obtiene lectura global de la tabla y falta verificar WABA+número+estado conectado en un flujo HTTP real. |
| Resolución del número bajo RLS | PARTIAL | Métodos scoped por ID oficial o número visible; no estaban integrados ni probados contra mismatches entre tenants. |
| Persistencia durable | PARTIAL | `MessageEvent` guarda metadata minimizada y hash; no guarda suficiente estado de recepción/reintento/lease/contrato normalizado para recuperación completa. |
| Deduplicación persistente | PARTIAL | Restricción `@@unique([phoneNumberId, metaEventId])` y captura P2002; no había pruebas concurrentes ni cobertura de reinicio. |
| Cola | PARTIAL | `queue.ts` crea BullMQ en Redis; no había patrón outbox/reconciliación desde PostgreSQL, job idempotente ni prueba de indisponibilidad/reinicio. |
| Worker asíncrono | MISSING | No existía `worker.ts` ni proceso ejecutable independiente. |
| Reintentos/dead letter/reclamo abandonado | MISSING | La enum solo tenía `PENDING`, `PROCESSED`, `FAILED`, `MANUAL_INTERVENTION`; no había lease, `nextAttemptAt`, backoff ni recuperación. |
| Reprocesamiento administrativo | MISSING | No había CLI/API restringida. |
| Observabilidad/health del worker | MISSING | Solo existía health general de etapas anteriores. |
| Suscripción WABA | PARTIAL | Etapa 2 expone `subscribeAppToWaba`; no consulta suscripciones existentes, no persiste estado ni evita operaciones duplicadas de forma verificable. |
| Retención y privacidad | PARTIAL | Se conserva hash y metadata mínima, no payload completo; falta política y procedimiento documentado. |
| Adaptadores de Etapa 4 | No aplicable | No se encontraron adaptadores nuevos; correctamente fuera de alcance. |

## Pruebas encontradas y ejecutadas

### Línea base ejecutada antes de modificar la Etapa 3

- `npm run typecheck`: aprobado.
- `npx prisma validate`: aprobado.
- `npm run test:unit`: **60/60 aprobadas**.
- Pruebas unitarias específicas de Etapa 3: **24/24 aprobadas** (`webhookClassify`, `webhookSignature`).
- `npm run test:integration` dentro del sandbox: falló por restricción de red local (`localhost:55563/55564` inaccesible), no por el código.
- La misma suite con acceso explícito a los contenedores aislados: **40 aprobadas, 19 omitidas**. Las 19 omisiones corresponden a suites condicionadas a `TEST_RUNTIME_DATABASE_URL`, que no estaba configurado en esa ejecución; por tanto RLS/concurrencia/rotación quedaron UNVERIFIED en esta línea base y deben ejecutarse de nuevo con el rol runtime real.

PostgreSQL 16 y Redis 7 de pruebas estaban activos y saludables en los puertos aislados `55563` y `55564`. No se accedió a Hostinger, Vercel ni Meta real.

## Errores y riesgos identificados

1. No existe endpoint HTTP de webhook; firma y parser están desconectados del servidor.
2. La confirmación durable no está implementada: no hay transacción de recepción que garantice almacenamiento antes del `2xx`.
3. Redis/BullMQ es usado como cola, pero no hay reconciliación desde PostgreSQL si Redis está caído después de persistir.
4. No existe worker, por lo que ningún evento puede pasar realmente a `PROCESSED`.
5. La máquina de estados y columnas actuales no permiten lease, recuperación de trabajos abandonados, `nextAttemptAt`, cuarentena y dead letter explícitos.
6. La tabla `waba_routes` sin RLS tiene permisos DML amplios para `app_runtime`; debe reducirse a la operación mínima de resolución y a escrituras controladas.
7. Los eventos administrativos sin número no tienen aún un destino persistente seguro; el esquema exige `phoneNumberId`.
8. La deduplicación usa `JSON.stringify` directo para payloads sin ID; necesita serialización canónica para que el orden de claves no cambie la huella.
9. No hay cifrado/payload recuperable. La estrategia inicial minimiza datos usando metadata normalizada y hash, pero debe demostrar que basta para reprocesar; si se guarda payload, deberá cifrarse y retenerse por tiempo limitado.
10. No hay cobertura HTTP real, concurrencia de diez entregas, reinicio, dos workers, indisponibilidad o E2E con dos tenants.
11. Los comentarios del código afirman documentación `docs/WEBHOOK_EVENT_CONTRACT.md` que no existe; las afirmaciones deben verificarse y documentarse contra fuentes oficiales vigentes.

## Elementos reutilizables

- Firma criptográfica y comparación constante.
- Esquemas Zod permisivos/fail-closed en el envelope.
- Clasificación inicial y regla de elegibilidad de automatización.
- Restricción única persistente para deduplicación.
- `TenantScope`, RLS y resolución de números dentro del tenant.
- `WabaRoute` como punto de arranque de resolución, sujeto a endurecimiento de privilegios.
- Infraestructura local PostgreSQL/Redis, cliente Graph v25.0 y pruebas de Etapas 1–2.

## Trabajo concreto pendiente

1. Verificar contratos oficiales vigentes y separar hechos confirmados de ejemplos/no verificables.
2. Completar la migración con inbox durable, estados explícitos, leases, reintentos, cuarentena/dead letter, timestamps e índices.
3. Implementar GET/POST con raw body, límite, firma, validación, recorrido completo, resolución segura y respuesta posterior al commit.
4. Implementar persistencia transaccional e idempotencia bajo concurrencia.
5. Implementar worker PostgreSQL-first recuperable, usando Redis solo como acelerador/coordinador opcional.
6. Implementar normalización versionada y contrato para Etapa 4 sin adaptadores.
7. Implementar reprocesamiento administrativo restringido, métricas/health y política de retención.
8. Completar suscripción WABA idempotente con Graph simulado, sin llamadas reales.
9. Añadir todos los grupos de pruebas exigidos y E2E HTTP real con dos tenants.
10. Ejecutar regresión completa con el rol `app_runtime` real y documentar resultados.

## Conclusión de recuperación

Estado inicial: **STAGE 3 INCOMPLETE**. El trabajo parcial es valioso y se conservará, pero no satisface todavía recepción durable, procesamiento asíncrono recuperable, aislamiento probado ni los criterios integrales de aceptación.

## Cierre de la recuperación

El diagnóstico anterior se conserva como evidencia del estado inicial. Al completar el trabajo:

- los componentes `PARTIAL/MISSING` fueron implementados sin descartar el borrador;
- `waba_routes` quedó revocada a `app_runtime` y sustituida por funciones estrechas;
- BullMQ parcial fue retirado del flujo: PostgreSQL es el inbox durable y Redis no condiciona el webhook;
- se agregaron migraciones separadas para enum y esquema/funciones;
- una reconstrucción desde cero aplicó las ocho migraciones correctamente;
- suite final: **146/146 aprobadas, 0 fallidas, 0 omitidas**.

El resultado final y las limitaciones reales se detallan en `STAGE3_TEST_REPORT.md` y `STAGE3_META_VERIFICATION_PENDING.md`.
