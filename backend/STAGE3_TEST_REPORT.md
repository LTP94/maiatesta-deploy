# Etapa 3 — informe de pruebas

Fecha final: 2026-09-29. Entorno: Node, PostgreSQL 16 y Redis 7 locales aislados (`55563/55564`). Rol de aplicación real `app_runtime`, RLS activo. Cero acceso a producción o Meta real.

## Resultado final

| Verificación | Resultado |
|---|---|
| `npx prisma validate` | PASS |
| migración desde cero (`prisma migrate reset`, DB efímera) | PASS, 8 migraciones |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| unitarias | 60/60 PASS |
| integración PostgreSQL/Redis | 80/80 PASS |
| seguridad | 6/6 PASS |
| suite total | **146/146 PASS, 0 fallidas, 0 omitidas** |

## Cobertura por grupo exigido

- A: challenge, token/modo/challenge alterados, firma válida/ausente/inválida, body modificado, JSON/estructura, 1 MiB, PostgreSQL no disponible y ausencia de efectos.
- B: inbound, eco manual, status, historial, contactos, cuenta, unknown, múltiples entradas/cambios, opcionales y formatos.
- C: dos tenants, WABA/número desconocidos, cruce, desconectado, varios números (regresión), RLS directo, pool concurrente y ruta restringida.
- D: duplicado secuencial, diez concurrentes, persistencia, estados distintos/repetidos, eco/historial, dos números y dos workers.
- E: DB indisponible, Redis no requerido, reinicio/lease, error transitorio/permanente, timeout, agotamiento, recuperación y reproceso scoped.
- Ventana de onboarding: `history`, `smb_app_state_sync`, `smb_message_echoes` y mensaje nuevo llegan antes de `OPERATIONAL`, se deduplican en cuarentena, se promueven automáticamente y producen cuatro efectos únicos. Otro caso cubre un evento anterior al commit visible de `WabaRoute` (`UNKNOWN_WABA`).
- F: todas las categorías no-customer son `automationEligible=false`; customer pausado también.
- G: HTTP responde tras persistir sin integraciones; lotes concurrentes, backlog, equidad y recuperación.
- H: todas las pruebas de Etapas 1–2 pasan con runtime RLS; cero skips.

El E2E usa HTTP real contra un servidor local, firma real, dos tenants, PostgreSQL real, duplicado, eco manual, worker y lease abandonado. Graph se simuló deliberadamente.

## Defectos encontrados y corregidos durante prueba

1. PostgreSQL no permite usar un valor enum en la transacción que lo crea: se separó la migración del enum.
2. Capturar `P2002` dentro de una transacción deja esa transacción abortada: se sustituyó por `ON CONFLICT DO NOTHING` atómico.
3. Prisma envió enteros como `bigint` y fechas como `timestamptz` a funciones tipadas: llamadas ahora hacen casts explícitos.
4. La suite `test:security` no tenía archivos y devolvía 1: se agregaron seis casos reales.

## Omitido deliberadamente

Pruebas contra Hostinger y Meta real: prohibidas por el alcance. No hay benchmark masivo; la prueba controlada de concurrencia valida integridad, no capacidad final de producción.
