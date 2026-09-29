# Etapa 3 — seguridad y privacidad

## Controles implementados

- POST acepta solo `application/json`, máximo 1 MiB y firma `sha256=` válida.
- HMAC-SHA256 se calcula sobre el `Buffer` original y se compara con `timingSafeEqual`.
- GET compara el verify token en tiempo constante y nunca lo registra.
- Pino redacta autorización, cookies, firma y body.
- Zod valida envelope/WABA/cambios; cada tipo interno tolera opcionales documentados.
- La ruta de tenant usa IDs verificados en onboarding. El teléfono visible solo se usa para `account_update`, que no ofrece phone-number ID en el contrato verificado.
- `app_runtime` no lista rutas ni cuarentenas. Funciones SQL tienen `search_path` fijo, `PUBLIC` revocado y grants explícitos.
- RLS se mantiene después de resolver. Un evento no puede cambiar su tenant durante reproceso.
- Idempotencia se impone mediante índice único y `ON CONFLICT`, no un check-then-insert.
- Payload recuperable cifrado AES-256-GCM con clave independiente del App Secret y de credenciales.
- Contrato, logs, errores y métricas omiten texto de conversación y tokens.

## Retención

Cada evento nace con `retentionExpiresAt = receivedAt + 30 días`. Operaciones debe eliminar payloads/eventos vencidos según obligaciones comerciales/legales antes de producción; esta etapa no ejecuta un borrado automático sin política aprobada. Backups de base y claves deben permanecer separados.

Las filas de cuarentena también tienen 30 días. Solo personal autorizado con acceso operacional al rol propietario puede inspeccionarlas. Los ejemplos de prueba son sintéticos.

## Modelo de amenazas y respuesta

| Riesgo | Respuesta |
|---|---|
| Body modificado/replay | Firma rechaza modificación; replay válido se deduplica. |
| WABA falsa o cruce de números | Resolución devuelve cuarentena, sin contexto de otro tenant. |
| Pool reutilizado | `SET LOCAL` dentro de cada transacción; pruebas concurrentes RLS. |
| Worker muerto | Lease expira y otro worker reclama. |
| Payload alterado en DB | GCM falla y el evento queda `QUARANTINED`. |
| Evento que bloquea | Timeout, backoff finito y estado de intervención. |
| Enumeración global | Tablas globales revocadas; funciones de capacidad limitada. |

## Antes de producción

Rotar/generar secretos en Hostinger, configurar TLS/proxy, restringir acceso del SO, implementar job de retención aprobado, revisar alertas y hacer una prueba Meta con WABA/número de prueba. No reutilizar claves de `.env.example`.
