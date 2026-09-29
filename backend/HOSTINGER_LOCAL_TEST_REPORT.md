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

Pendiente por requerir infraestructura/aprobación real:

- auditoría de recursos y nombres en la VPS;
- creación de redes y volúmenes Hostinger;
- conexión exclusiva de NPM a la red ingress;
- DNS, certificado y Proxy Host;
- despliegue/migración reales;
- configuración y despliegue aprobados de `VITE_WHATSAPP_BACKEND_URL` en Vercel;
- configuración Meta y prueba controlada de Coexistence.
