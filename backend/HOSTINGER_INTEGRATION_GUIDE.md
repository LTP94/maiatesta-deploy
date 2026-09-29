# Guía de integración piloto en Hostinger

Estado: **PREPARADO, NO EJECUTADO**. Esta guía no autoriza ningún cambio en
Hostinger, DNS, Nginx Proxy Manager (NPM), Vercel ni Meta. Requiere aprobación
explícita antes de la sección «Cambios de infraestructura».

## 1. Alcance y condiciones de parada

El piloto instala únicamente el backend de Coexistence terminado hasta Etapa
3. No conecta Evolution API, Typebot, n8n ni Chatwoot; esas integraciones son
Etapa 4. Chatwoot permanece en su otro servidor. Tampoco reutiliza el
PostgreSQL o Redis de otro producto: crea contenedores y volúmenes dedicados.

Convenciones de esta guía:

- **[LECTURA]**: consulta estado; no debe reiniciar ni reconfigurar servicios.
- **[CAMBIO]**: modifica disco, Docker, DNS, NPM, base de datos o Meta.
- **[REVERSIÓN]**: revierte el cambio inmediatamente anterior.
- **[DESTRUCTIVO]**: solo con respaldo verificado y aprobación específica.

Detener el procedimiento si falta un respaldo, una variable, el nombre exacto
del contenedor NPM, 2 GB de RAM disponible durante la instalación, 10 GB de
disco libre, o si algún servicio existente ya está degradado.

## 2. Arquitectura propuesta

```text
Internet / Meta / navegador en Vercel
                  |
                HTTPS
                  |
        Nginx Proxy Manager
                  |
      maiatesta_backend_ingress
        (solo NPM + backend)
                  |
               backend
                  |
      maiatesta_whatsapp_private (internal)
             /             \
      PostgreSQL          Redis
             \
              worker
```

`postgres`, `redis`, `worker` y las operaciones de migración solo se conectan
a `maiatesta_whatsapp_private`. Ni PostgreSQL ni Redis se conectan a
`npm_network` o a la red ingress. El backend tampoco se conecta a la red
compartida `npm_network`: NPM recibe una segunda interfaz en la red dedicada
`maiatesta_backend_ingress`.

La red ingress no es `internal` porque el backend necesita salida HTTPS hacia
Meta Graph API. No hay puertos publicados al host; NPM alcanza el puerto 4000
por DNS interno de Docker.

### Presupuesto de recursos

| Servicio | CPU máx. | RAM máx. | Persistencia |
|---|---:|---:|---|
| PostgreSQL 16 | 0.60 | 768 MiB | volumen dedicado + directorio de backups |
| Redis 7 | 0.20 | 256 MiB | AOF `everysec`, volumen dedicado |
| backend | 0.45 | 384 MiB | sin estado local |
| worker | 0.35 | 384 MiB | sin estado local |
| operaciones, temporal | 0.50 | 512 MiB | ninguna |

Máximo estable: 1.60 vCPU y aproximadamente 1.75 GiB. Los límites protegen los
servicios existentes, pero no sustituyen la medición previa de Evolution,
NPM, Typebot y n8n. Redis usa `noeviction`: ante presión de memoria falla la
escritura en lugar de expulsar tokens de un solo uso y debilitar su seguridad.

## 3. Archivos de esta entrega

- `docker-compose.hostinger.yml`: stack aislado, worker, operaciones y límites.
- `.env.hostinger.example`: inventario de variables sin secretos.
- `Dockerfile`: imágenes separadas `runtime` y `operations`.
- `prisma/migrations/20260929210000_add_webhook_retention_cleanup/migration.sql`:
  limpieza por lotes y exclusión de cuarentenas expiradas.
- `src/webhook/retention.ts`: llamada restringida a la limpieza.
- `src/worker-healthcheck.ts`: health check por heartbeat real.

## 4. Diagnóstico previo obligatorio

Ejecutar y guardar la salida fuera del repositorio. Todos estos comandos son
**[LECTURA]**:

```bash
date -Is
uname -a
docker version
docker compose version
docker ps --no-trunc --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker stats --no-stream
docker network ls
docker network inspect npm_network
docker volume ls
df -h
free -h
uptime
ss -lntup
```

Identificar el contenedor real de NPM, sin asumir su nombre:

```bash
docker ps --format '{{.Names}} {{.Image}}' | grep -Ei 'nginx-proxy-manager|jc21/nginx-proxy-manager'
```

Para cada contenedor existente, registrar `Id`, imagen, hora de inicio,
restart count y health. Sustituir `<contenedor>` por cada nombre observado:

```bash
docker inspect --format '{{.Name}} image={{.Image}} started={{.State.StartedAt}} restarts={{.RestartCount}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' <contenedor>
```

No continuar si NPM, Evolution, PostgreSQL, Redis, Typebot o n8n cambian de
estado durante esta línea base.

## 5. Variables y claves

**[CAMBIO — filesystem únicamente]** Copiar `.env.hostinger.example` como
`.env.hostinger` en un directorio dedicado, por ejemplo
`/opt/maiatesta-whatsapp`, y protegerlo:

```bash
install -d -m 700 /opt/maiatesta-whatsapp
install -d -m 700 /opt/maiatesta-whatsapp/backups
install -m 600 .env.hostinger.example /opt/maiatesta-whatsapp/.env.hostinger
```

**[REVERSIÓN]** Antes de crear datos, mover el directorio a un nombre de
cuarentena; no borrarlo si ya contiene backups o volúmenes referenciados.

Reglas:

- Generar cada contraseña con `openssl rand -hex 24`.
- Generar claves de 32 bytes con `openssl rand -hex 32`.
- No reutilizar ninguna clave entre PostgreSQL, Redis, health check, tokens,
  cifrado de credenciales, payloads o Meta.
- `META_APP_SECRET` proviene de Meta y no se deriva de otra clave.
- Mantener `.env.hostinger` fuera de Git, backups sin cifrar, tickets y chat.
- Usar valores hexadecimales en contraseñas embebidas en URLs.
- `ALLOWED_ORIGINS` contiene orígenes exactos, sin `*`. Añadir un preview de
  Vercel solo si se aprobó expresamente ese hostname.
- Mantener una copia cifrada y externa de las claves; sin las claves de
  cifrado no se pueden recuperar credenciales ni payloads aún vigentes.

**[LECTURA]** Verificar permisos sin mostrar contenido:

```bash
stat -c '%a %U:%G %n' /opt/maiatesta-whatsapp/.env.hostinger
```

Debe devolver modo `600` y el propietario operativo esperado.

## 6. Validación local del paquete en el VPS

Estos pasos todavía no arrancan servicios de aplicación.

**[LECTURA]** Validar sintaxis sin imprimir variables expandidas:

```bash
cd /opt/maiatesta-whatsapp/backend
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml config --quiet
```

No usar `docker compose config` sin `--quiet`: mostraría secretos expandidos.

**[CAMBIO — imágenes/disco]** Construir imágenes con un tag inmutable que
incluya fecha y commit, sin usar `latest`:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml build backend
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml --profile operations build migrate
```

**[REVERSIÓN]** No eliminar imágenes previas. Si la imagen nueva falla,
restaurar `BACKEND_IMAGE_TAG` al tag anterior. La eliminación de imágenes solo
se hace más tarde, tras verificar que ningún contenedor las usa.

## 7. Cambios de infraestructura — requieren aprobación

### 7.1 Red ingress dedicada

**[CAMBIO]** Crear la red y conectar únicamente NPM. Sustituir
`<contenedor-npm-confirmado>` por el nombre obtenido en la auditoría:

```bash
docker network create --driver bridge maiatesta_backend_ingress
docker network connect maiatesta_backend_ingress <contenedor-npm-confirmado>
```

**[LECTURA]** La siguiente salida debe contener solo NPM antes del arranque y
NPM + `maiatesta-whatsapp-backend` después:

```bash
docker network inspect maiatesta_backend_ingress --format '{{range .Containers}}{{println .Name}}{{end}}'
```

**[REVERSIÓN]** Primero detener el backend, luego:

```bash
docker network disconnect maiatesta_backend_ingress <contenedor-npm-confirmado>
docker network rm maiatesta_backend_ingress
```

No ejecutar la reversión mientras el proxy host siga activo.

### 7.2 Base de datos y Redis dedicados

**[CAMBIO]** Arrancar únicamente almacenamiento:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml up -d postgres redis
```

**[LECTURA]** Verificar salud y que no existe publicación de puertos:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml ps
docker port maiatesta-whatsapp-postgres
docker port maiatesta-whatsapp-redis
docker inspect --format '{{json .NetworkSettings.Networks}}' maiatesta-whatsapp-postgres
docker inspect --format '{{json .NetworkSettings.Networks}}' maiatesta-whatsapp-redis
```

`docker port` debe producir salida vacía y ambos contenedores deben aparecer
solo en `maiatesta_whatsapp_private`.

**[REVERSIÓN]** Si todavía no se migró ni creó información:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml stop postgres redis
```

No usar `down -v`: eliminaría datos. Los volúmenes se conservan incluso al
retirar los contenedores.

### 7.3 Migraciones y rol runtime

**[LECTURA — contenedor temporal]** Consultar estado antes de migrar:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml --profile operations run --rm migrate npx prisma migrate status
```

**[CAMBIO — esquema]** Aplicar migraciones una sola vez con el rol dueño:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml --profile operations run --rm migrate
```

**[CAMBIO — rol]** Fijar/rotar la contraseña del rol restringido creado por la
migración:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml --profile operations run --rm bootstrap-role
```

**[LECTURA — contenedor temporal]** Verificar identidad, ausencia de bypass
RLS y privilegios peligrosos. `RUNTIME_DATABASE_URL`/`OWNER_DATABASE_URL` son
URLs estilo Prisma (llevan `?schema=public`) — `psql`/libpq no reconocen ese
parámetro de query, así que aquí también se descarta antes de conectar
(`%%\?*`, la misma técnica que usa `scripts/bootstrap-db-roles.sh`):

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml --profile operations run --rm --entrypoint sh bootstrap-role -c 'psql "${RUNTIME_DATABASE_URL%%\?*}" -v ON_ERROR_STOP=1 -c "SELECT current_user, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname = current_user" -c "SELECT has_schema_privilege(current_user, '\''public'\'', '\''CREATE'\'') AS can_create, has_table_privilege(current_user, '\''message_events'\'', '\''TRUNCATE'\'') AS can_truncate" -c "SELECT count(*) AS rows_visible_without_tenant_context FROM tenants"'
```

Resultado exigido: `app_runtime`, todos los flags elevados en `false`,
`can_create=false`, `can_truncate=false` y cero tenants visibles sin contexto.

Las migraciones son forward-only. No editar migraciones ya aplicadas ni usar
`prisma migrate reset` en el VPS.

**[REVERSIÓN]** Si una migración falla, no iniciar backend/worker. Conservar
logs, restaurar el backup previo en una base nueva según la sección 11 y usar
la imagen anterior. No intentar un rollback SQL improvisado.

### 7.4 Backend y worker

**[CAMBIO]** Iniciar los dos procesos:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml up -d backend worker
```

**[LECTURA]** Verificar:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml ps
docker inspect --format '{{.State.Health.Status}}' maiatesta-whatsapp-backend
docker inspect --format '{{.State.Health.Status}}' maiatesta-whatsapp-worker
docker logs --since 5m maiatesta-whatsapp-backend
docker logs --since 5m maiatesta-whatsapp-worker
docker stats --no-stream maiatesta-whatsapp-backend maiatesta-whatsapp-worker maiatesta-whatsapp-postgres maiatesta-whatsapp-redis
```

**[REVERSIÓN]** Detener solo los procesos nuevos; conservar datos:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml stop backend worker
```

## 8. HTTPS, NPM y superficie pública

Elegir un hostname exclusivo, por ejemplo `whatsapp-api.maiatesta.com`.

### DNS

**[CAMBIO]** Crear un registro A/AAAA hacia la VPS con TTL corto durante el
piloto. **[REVERSIÓN]** eliminar el registro o restaurar su valor anterior.
Esperar propagación antes de solicitar el certificado.

### Proxy Host en NPM

**[CAMBIO]** Crear un Proxy Host:

- Domain: hostname aprobado.
- Scheme interno: `http`.
- Forward hostname: `maiatesta-whatsapp-backend`.
- Forward port: `4000`.
- Websockets: desactivado; no se usan.
- Cache assets: desactivado.
- Block common exploits: activado.
- Certificado Let's Encrypt, Force SSL y HTTP/2 activados.
- HSTS solo después de validar el certificado; no habilitar subdominios.

Configuración avanzada sugerida:

```nginx
client_max_body_size 1m;
proxy_connect_timeout 5s;
proxy_read_timeout 30s;
proxy_send_timeout 30s;
```

No configurar una Access List de NPM sobre todo el host: Meta debe alcanzar el
webhook. La autenticación vive en cada endpoint. **[REVERSIÓN]** deshabilitar
o eliminar exclusivamente este Proxy Host; no reiniciar ni editar otros hosts.

### Endpoints imprescindibles

| Endpoint | Consumidor | Protección |
|---|---|---|
| `GET /webhooks/meta/whatsapp` | verificación Meta | verify token, comparación constante |
| `POST /webhooks/meta/whatsapp` | eventos Meta | `X-Hub-Signature-256` HMAC con App Secret, body crudo ≤1 MiB |
| `POST /onboarding/start` | navegador | invitation token de un uso, Redis y rate limit |
| `POST /onboarding/session` | navegador | session token firmado y corto |
| `POST /onboarding/complete` | navegador | session token; código se intercambia server-side |
| `GET /health` | operación | `Authorization: Bearer <HEALTHCHECK_TOKEN>` |

CORS solo admite `ALLOWED_ORIGINS`; CORS no reemplaza autenticación. No
publicar PostgreSQL, Redis, métricas sin token ni endpoints administrativos.

**[LECTURA]** Pruebas HTTPS sin datos reales:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://<hostname>/health
curl -fsS -H 'Authorization: Bearer <token-cargado-en-shell>' https://<hostname>/health
curl -fsS -o /dev/null -w '%{http_code}\n' 'https://<hostname>/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=incorrecto&hub.challenge=test'
```

Resultados esperados: `401`, JSON `ok:true`, y `403`, respectivamente. No
poner el token real directamente en el historial; cargarlo temporalmente desde
el archivo protegido.

## 9. Comunicación segura con Vercel

El frontend implementa el flujo usando los endpoints existentes. La invitación
se entrega como fragmento (`/whatsapp/connect/#invite=<token>`), que no forma
parte de la petición HTTP, y se elimina de la barra e historial antes del primer
`await`. El navegador conserva invitación, session token, Session Info y
authorization code solo en memoria; usa `credentials: omit`,
`referrerPolicy: no-referrer` y nunca los registra.

**[CAMBIO POSTERIOR EN VERCEL, no ejecutar aún]**:

1. crear `VITE_WHATSAPP_BACKEND_URL=https://whatsapp-api.maiatesta.com` para
   Preview y Production (es URL pública, no un secreto);
2. comprobar que ese hostname coincide con el Proxy Host aprobado en NPM;
3. desplegar el commit aprobado para que Vite inserte la URL en el build;
4. verificar que la cabecera CSP de `/whatsapp/connect/` contiene únicamente
   ese origen adicional en `connect-src`;
5. si se prueba desde un dominio Preview, añadir solo ese origen exacto y
   temporal a `ALLOWED_ORIGINS`; nunca `*.vercel.app` ni `*`, y retirarlo al
   terminar.

El backend aplica CORS solo bajo `/onboarding`; webhooks y health no reciben
cabeceras CORS. `ALLOWED_ORIGINS` rechaza comodines y orígenes HTTP no locales.
La comunicación navegador→Hostinger queda autenticada por invitation/session
tokens y TLS. No se copian `META_APP_SECRET`, claves de cifrado, verify token,
credenciales PostgreSQL ni `ADMIN_API_KEY` a Vercel.

## 10. Retención automática

Cada evento y cuarentena recibe `retentionExpiresAt` a 30 días. El worker corre
la limpieza al iniciar y cada 15 minutos:

- elimina hasta 500 filas por tabla y por lote;
- ejecuta como máximo 10 lotes por ciclo para no monopolizar PostgreSQL;
- protege filas con un lease activo;
- elimina después de expirar estados `RECOVERED`, `MANUAL_INTERVENTION` y
  cuarentenas sin ruta;
- nunca reclama una cuarentena ya expirada;
- una `UNKNOWN_WABA` sin ruta no consume reintentos: permanece durable hasta
  su fecha de retención y entonces se elimina.
- un fallo de limpieza queda como `RETENTION_CLEANUP_FAILED` en el heartbeat,
  se reintenta como máximo una vez por minuto y no bloquea la cola principal.

Los fallos reales de descifrado/procesamiento llegan a
`MANUAL_INTERVENTION` tras cinco intentos; una ruta que todavía no está lista
se difiere sin consumir ese presupuesto.

**[LECTURA]** Auditoría por estado, sin descifrar contenido:

```sql
SELECT "processingState", count(*), min("retentionExpiresAt")
FROM message_events GROUP BY 1 ORDER BY 1;

SELECT "reasonCode", "recoveryState", count(*), min("retentionExpiresAt")
FROM webhook_quarantine_events GROUP BY 1, 2 ORDER BY 1, 2;
```

No ejecutar `DELETE` manual para «desbloquear» colas.

## 11. Backups y restauración

### Backup previo y periódico

**[CAMBIO — crea archivos]** Ejecutar antes de cada actualización y, durante
el piloto, diariamente. El directorio está montado como `/backups` solo en el
PostgreSQL dedicado:

```bash
BACKUP_NAME="maiatesta-$(date -u +%Y%m%dT%H%M%SZ)"
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "/opt/maiatesta-whatsapp/backups/${BACKUP_NAME}.dump"
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml exec -T postgres sh -lc 'pg_dumpall -U "$POSTGRES_USER" --globals-only' > "/opt/maiatesta-whatsapp/backups/${BACKUP_NAME}-globals.sql"
chmod 600 "/opt/maiatesta-whatsapp/backups/${BACKUP_NAME}.dump" "/opt/maiatesta-whatsapp/backups/${BACKUP_NAME}-globals.sql"
sha256sum "/opt/maiatesta-whatsapp/backups/${BACKUP_NAME}.dump" "/opt/maiatesta-whatsapp/backups/${BACKUP_NAME}-globals.sql"
```

Copiar ambos archivos y checksums a almacenamiento cifrado fuera de la VPS.
El dump contiene datos personales cifrados y metadatos: tratarlo como secreto.
Conservar al menos 7 diarios y 4 semanales, sujeto a la política legal final.

### Prueba de restauración no destructiva

**[CAMBIO — crea DB temporal]** Restaurar a una base con nombre nuevo dentro
del PostgreSQL dedicado, nunca sobre la activa:

```bash
RESTORE_DB=maiatesta_restore_test_YYYYMMDD
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml exec -T -e RESTORE_DB="$RESTORE_DB" postgres sh -lc 'createdb -U "$POSTGRES_USER" "$RESTORE_DB"'
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml exec -T -e RESTORE_DB="$RESTORE_DB" postgres sh -lc 'pg_restore -U "$POSTGRES_USER" -d "$RESTORE_DB" --no-owner /backups/<backup>.dump'
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml exec -T -e RESTORE_DB="$RESTORE_DB" postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -c "SELECT count(*) FROM _prisma_migrations" -c "SELECT count(*) FROM message_events" -c "SELECT count(*) FROM webhook_quarantine_events"'
```

**[DESTRUCTIVO — solo DB temporal]** Tras documentar la prueba:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml exec -T -e RESTORE_DB="$RESTORE_DB" postgres sh -lc 'dropdb -U "$POSTGRES_USER" "$RESTORE_DB"'
```

### Restauración/rollback real

1. Detener backend y worker.
2. Tomar un backup del estado fallido.
3. Restaurar el backup elegido en una **base nueva**, no sobre la anterior.
4. Verificar migraciones, conteos, RLS y `app_runtime`.
5. Cambiar `POSTGRES_DB` al nombre restaurado y recrear solo los cuatro
   contenedores de este stack.
6. Mantener la base anterior intacta hasta cerrar el incidente.

Restaurar `*-globals.sql` solo en un PostgreSQL dedicado nuevo y vacío; contiene
roles del clúster y no debe ejecutarse en un PostgreSQL compartido.

## 12. Actualización sin pérdida y rollback de aplicación

1. **[LECTURA]** Capturar baseline de todos los contenedores existentes.
2. **[CAMBIO]** Crear y verificar backup.
3. **[CAMBIO]** Construir un tag nuevo; conservar el anterior.
4. **[LECTURA]** Ejecutar `prisma migrate status`.
5. **[CAMBIO]** Ejecutar `prisma migrate deploy` una sola vez.
6. **[CAMBIO]** Recrear únicamente `backend` y `worker` con el tag nuevo:

```bash
docker compose --env-file ../.env.hostinger -f docker-compose.hostinger.yml up -d --no-deps backend worker
```

7. **[LECTURA]** Ejecutar todas las verificaciones posteriores.

**[REVERSIÓN de código]** Restaurar `BACKEND_IMAGE_TAG` y recrear únicamente
backend/worker. **[REVERSIÓN de esquema/datos]** usar una base restaurada según
la sección 11. Nunca usar `docker compose down -v`, `prisma migrate reset` ni
borrar volúmenes durante un rollback.

## 13. Verificación posterior y comparación con servicios existentes

**[LECTURA]** Repetir exactamente la línea base de la sección 4 y comparar:

- mismos contenedores preexistentes, image IDs y `StartedAt`;
- `RestartCount` sin incrementos inesperados;
- health de NPM, Evolution, Typebot y n8n sin cambios;
- uso total de CPU/RAM aceptable;
- ningún puerto nuevo para PostgreSQL, Redis o backend;
- red ingress con exactamente NPM + backend;
- red privada con solo backend, worker, PostgreSQL, Redis y contenedores
  temporales mientras existan;
- `npm_network` sin PostgreSQL/Redis de Maiatesta.

```bash
docker ps --no-trunc --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker stats --no-stream
docker network inspect maiatesta_backend_ingress --format '{{range .Containers}}{{println .Name}}{{end}}'
docker network inspect maiatesta_whatsapp_private --format '{{range .Containers}}{{println .Name}}{{end}}'
docker network inspect npm_network --format '{{range .Containers}}{{println .Name}}{{end}}'
docker port maiatesta-whatsapp-postgres
docker port maiatesta-whatsapp-redis
docker port maiatesta-whatsapp-backend
df -h
free -h
```

Si un servicio existente reinició, perdió health o aumentó sostenidamente su
latencia/uso de memoria, detener backend/worker y escalar el hallazgo antes de
continuar con NPM o Meta.

## 14. Secuencia posterior con cuenta y número de prueba

Esta secuencia ocurre solo después de aprobar infraestructura **y** el cambio
frontend pendiente. Usar una cuenta, Business Portfolio, WABA y número sin
clientes ni conversaciones reales.

1. Confirmar en WhatsApp Business App que el número de prueba funciona, puede
   enviar/recibir y tiene respaldo. Registrar versión y estado, sin exportar
   chats al repositorio.
2. Confirmar que el flujo mostrado por Meta es explícitamente **Coexistence**.
   Abortarlo si propone migración, desconexión o eliminación de la app.
3. Configurar en la app Meta de prueba el callback HTTPS y el verify token;
   suscribir `messages`, `smb_message_echoes`, `smb_app_state_sync` y `history`
   según lo permitido por esa app/WABA.
4. Crear un tenant/admin exclusivamente de prueba y emitir una invitación por
   una operación administrativa autenticada. La UI/CLI administrativa sigue
   siendo una limitación conocida; no insertar tenants con SQL improvisado.
5. Completar Embedded Signup desde el frontend aprobado. El backend debe
   persistir `isOnBizApp=true`, `platformType` esperado y número
   `OPERATIONAL`. Si `isOnBizApp` no es `true`, abortar.
6. Verificar inmediatamente que WhatsApp Business App sigue abierta y puede
   enviar y recibir.
7. Enviar desde otro número un mensaje nuevo; debe producir exactamente un
   `CUSTOMER_INBOUND` elegible.
8. Responder manualmente desde WhatsApp Business App; debe producir un
   `BUSINESS_APP_ECHO` no elegible para automatización.
9. Confirmar sincronización de contacto e historial sin respuestas
   automáticas y sin duplicados.
10. Reiniciar solo el worker y confirmar recuperación por lease, health y
    ausencia de doble efecto.
11. Mantener Evolution, Typebot, n8n y Chatwoot desconectados durante toda la
    prueba; conectarlos sería Etapa 4.
12. Al cerrar el piloto, revocar únicamente la autorización/app de prueba si
    corresponde, sin migrar ni eliminar el número de WhatsApp Business App.

## 15. Puerta de aprobación

Antes del despliegue deben existir evidencias de:

- suite local completa aprobada;
- `docker compose config --quiet` aprobado con valores sintéticos;
- migración desde cero aprobada;
- backup y restauración ensayados en entorno local/aislado;
- inventario real de NPM y recursos de la VPS;
- hostname y ventana de mantenimiento aprobados;
- frontend Vercel aún sin modificar y plan separado aprobado;
- cuenta/número de prueba identificados, nunca un cliente real.

Hasta recibir esa aprobación, no ejecutar ninguna sección marcada **[CAMBIO]**.
