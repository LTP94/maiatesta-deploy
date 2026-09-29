# Informe local — preparación del piloto Hostinger

Fecha: 2026-09-29. Estado: **LOCAL PASS / HOSTINGER NOT EXECUTED**.

No se accedió a Hostinger, Vercel, DNS, Nginx Proxy Manager ni Meta. Todas las
pruebas usaron PostgreSQL/Redis aislados en `localhost:55563/55564`, datos
sintéticos e imágenes Docker locales sin publicar.

| Verificación | Resultado |
|---|---|
| `npx prisma validate` | PASS |
| reconstrucción de DB desde cero | PASS, 9 migraciones |
| prueba específica de retención | 3/3 PASS |
| suite total | **156/156 PASS**, 0 fallidas, 0 omitidas |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `docker compose ... config --quiet` con valores sintéticos | PASS |
| imagen Docker `runtime` | PASS |
| imagen Docker `operations` con Prisma/psql/scripts | PASS |
| health sin token | PASS, HTTP 401 |
| health autenticado | PASS, DB conectada y worker `RUNNING` |
| health check interno del worker | PASS, exit 0 |
| backup `pg_dump -Fc` + restauración en DB nueva | PASS |
| integridad básica restaurada | PASS, 9 migraciones y conteos esperados |

La primera construcción detectó que Alpine no exponía OpenSSL explícitamente
y Prisma elegía un binario por defecto. Se añadió `openssl` a las etapas
`build` y `runtime`; la reconstrucción final generó Prisma sin advertencias.
También se añadió `.dockerignore` para impedir que `.env`, dependencias,
resultados de build, pruebas o documentación entren al contexto del daemon.

Las pruebas de retención confirman:

- eliminación de `message_events` expirados;
- eliminación de cuarentenas expiradas, incluido `MANUAL_INTERVENTION`;
- conservación de filas no expiradas;
- protección de filas con lease activo y eliminación tras vencerlo;
- una WABA desconocida sin ruta no consume reintentos y es eliminada por el
  ciclo automático del worker al expirar.

Los dos contenedores efímeros de verificación, la base temporal restaurada y
el dump temporal fueron eliminados al terminar. Las imágenes de verificación
permanecen únicamente en el Docker local y no se publicaron.

## Corrección posterior — `bootstrap-db-roles.sh` y las 5 suites fallidas

Fecha: 2026-09-29. Dos problemas detectados en una revisión posterior de este
informe, ambos corregidos y re-verificados — sin tocar Hostinger, Vercel ni
ninguna otra base de datos ajena a esta verificación.

**1. `bootstrap-role` fallaba con `psql: error: invalid URI query parameter: "schema"`.**
Causa: `OWNER_DATABASE_URL`/`RUNTIME_DATABASE_URL` son URLs estilo Prisma
(`?schema=public`), y libpq/`psql` no reconocen ese parámetro. Corregido en
`scripts/bootstrap-db-roles.sh`: la URL se sanea (`%%\?*`, se descarta la
query string completa — un `ALTER ROLE` es una operación de rol, nunca de
esquema) antes de invocar `psql`, sin introducir una segunda variable de
entorno paralela. `HOSTINGER_INTEGRATION_GUIDE.md` §7.3 actualizado con la
misma técnica (además de un typo real que tenía, `rolbypassrl` sin la `s`
final).

Procedimiento completo re-ejecutado de punta a punta, **sin ninguna
intervención manual**: Postgres/Redis aislados → 9 migraciones → `bootstrap-role`
(ahora sin fallar) → backend autenticado como `app_runtime`
(`/health` → `"database":"connected"`) → confirmado por consulta directa a
`pg_roles` que `app_runtime` tiene `rolsuper=false`, `rolbypassrls=false`,
`rolcreatedb=false`, `rolcreaterole=false` → confirmado con dos tenants
reales y una lectura directa por `id` (sin pasar por la aplicación) que
`app_runtime`, con el contexto de tenant A fijado, obtiene **cero filas** al
pedir la fila del tenant B.

**2. Las 5 suites que fallaban con `PrismaClientInitializationError:
Authentication failed... app_runtime`.** Investigado, no asumido: los logs
del contenedor Postgres de pruebas COMPARTIDO muestran los intentos
`FATAL: password authentication failed for user "app_runtime"` exactamente
en el mismo segundo en que corrió esa suite — confirma que sí fue un
problema de credencial, no de red ni de código. Con esa misma contraseña,
una conexión posterior (tras que algún otro proceso reaplicara la
contraseña conocida sobre ese contenedor compartido) volvió a funcionar —
es decir, el contenedor de pruebas compartido cambia de contraseña según
quién lo re-bootstrapee por última vez, no es un valor estable entre
sesiones concurrentes.

Se ejecutó la suite completa contra un entorno nuevo, aislado, creado y
destruido solo para esta verificación (nunca contra el Postgres/Redis
compartido de otras sesiones): **156/156 pruebas, 0 fallidas, 0 omitidas**
— antes se reportaban 43 casos "omitidos" que en realidad eran los `it()`
de esas 5 suites nunca ejecutados porque su `beforeAll` fallaba al
conectar, no pruebas deliberadamente saltadas con `.skip`.

**Validación final repetida de punta a punta tras ambas correcciones:**
imágenes `runtime`/`operations` reconstruidas desde cero, `docker compose
... config` válido, 9 migraciones, `bootstrap-role` sin intervención
manual, backend+worker healthy, `/health` autenticado con datos reales,
suite completa (156/156), `tsc --noEmit` y `npm run build` limpios. Todo
el entorno de verificación (contenedores, red, imágenes con tag temporal,
archivo de secretos sintéticos) se destruyó al terminar.

## Pendiente por requerir infraestructura/aprobación real:

- auditoría de recursos y nombres en la VPS;
- creación de redes y volúmenes Hostinger;
- conexión exclusiva de NPM a la red ingress;
- DNS, certificado y Proxy Host;
- despliegue/migración reales;
- configuración y despliegue aprobados de `VITE_WHATSAPP_BACKEND_URL` en Vercel;
- configuración Meta y prueba controlada de Coexistence.
