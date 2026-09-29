# Etapa 3 — operaciones

## Procesos

```bash
npm run start          # receptor HTTP
npm run start:worker   # worker independiente
```

Ambos usan `RUNTIME_DATABASE_URL`. Solo migraciones usan `DATABASE_URL`. El worker necesita `META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY`; Redis no es dependencia del flujo webhook.

## Diagnóstico

- `GET /health`: conectividad DB y contadores locales de recibidos, almacenados, duplicados, cuarentena, errores, procesados y reintentos.
- Consultar por tenant, siempre bajo `TenantScope`: `processingState`, `processingAttempts`, `nextAttemptAt`, `lastErrorCode`, `leaseExpiresAt`.
- Backlog: `PENDING`/`RETRY_PENDING`; abandonado: `PROCESSING` con lease vencido; atención: `QUARANTINED`/`MANUAL_INTERVENTION`.
- Nunca copiar payload cifrado, firmas, tokens o contenido a tickets/logs.

## Recuperación

1. Si HTTP no puede confirmar almacenamiento devuelve `503`; restaurar PostgreSQL y dejar que Meta reintente.
2. Si el worker se reinicia, iniciar nuevamente. Los leases vencidos se recuperan automáticamente.
3. Si Redis cae, el webhook/worker continúan; el onboarding de Etapa 2 sí puede degradarse.
4. Si se agotan cinco intentos, investigar `lastErrorCode` sin exponer contenido.
5. Reprocesar con `reprocessWebhookEvent(prisma, tenantIdAutenticado, eventId)`. Una combinación cruzada actualiza cero filas y el tenant almacenado nunca cambia.

No reprocesar una operación de inicio de sync de historial/contactos: son operaciones separadas, condicionadas por consentimiento y potencialmente de una sola ejecución.

## Despliegue futuro (no ejecutado)

1. Backup y validación de migraciones.
2. `prisma migrate deploy` con rol propietario.
3. Bootstrap/rotación de `app_runtime`.
4. Iniciar receptor y worker con una sola réplica cada uno inicialmente.
5. Configurar callback HTTPS en Meta y luego suscribir una WABA de prueba.
6. Observar backlog, latencia, duplicados, cuarentena y memoria/CPU.

Rollback de código no debe revertir destructivamente migraciones ni eliminar inbox. Detener workers conserva eventos; desplegar una versión compatible y reanudar.
