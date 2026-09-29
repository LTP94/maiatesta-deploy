# Decisión de arquitectura — backend de WhatsApp Business App Coexistence

## Decisión: Alternativa B (backend propio en Hostinger, separado de Vercel)

Vercel sigue sirviendo el sitio estático y exactamente los mismos 3 endpoints que ya tiene desplegados y probados (`/api/meta/whatsapp/config`, `/api/meta/facebook/deauthorize`, `/api/meta/facebook/data-deletion`, `/api/meta/health`) — **ninguno de ellos se toca**. Todo lo nuevo (onboarding, persistencia, webhook, integraciones) vive en un servicio backend independiente (`backend/`, este directorio), pensado para desplegarse en Hostinger junto al resto de la infraestructura de mensajería.

## Por qué, con evidencia — no solo preferencia

Coincide con tu preferencia inicial, pero la justificación real es técnica:

1. **Las funciones de Vercel son serverless/efímeras por diseño.** Confirmado en `docs/meta-whatsapp-embedded-signup.md`: los 3 endpoints existentes son Web Handlers de Vercel (`export function GET()`/`POST()`) sin estado entre invocaciones. Postgres y Redis necesitan conexiones persistentes o un pooler (PgBouncer/Prisma Accelerate); añadir eso a Vercel es exactamente la complejidad operativa que la Alternativa A tendría que resolver, mientras que un backend con proceso persistente (lo que este directorio implementa) mantiene un pool de conexiones de forma nativa.
2. **La infraestructura de mensajería (Evolution API, Chatwoot, Typebot, n8n, Postgres, Redis) ya vive en Hostinger**, según el propio contexto del proyecto. Poner el onboarding ahí significa que la orquestación con esos servicios ocurre en la misma red privada, sin exponer Postgres/Redis a Internet (requisito explícito del punto 5 del pedido) y sin depender de que Vercel alcance una IP/puerto específico de Hostinger para cada llamada.
3. **Vercel ya funciona bien para lo que hace hoy** — servir contenido estático + 3 endpoints sin estado. Forzarlo a ser también el backend de onboarding de un sistema multiempresa con persistencia cifrada es mezclar dos responsabilidades muy distintas en la misma plataforma, cuando ya existe una plataforma (Hostinger) mejor preparada para la segunda.
4. **Cero acceso a Hostinger desde este entorno de desarrollo** (confirmado explícitamente por el usuario). Esto no cambia la decisión — de hecho la refuerza, porque construir contra una arquitectura que asume que Vercel puede alcanzar Postgres/Redis de Hostinger sin saber si existe ese camino de red sería una suposición no verificada, exactamente lo que esta auditoría/desarrollo debe evitar.

## Qué NO se decide aquí (correctamente, por falta de información)

- **No se elige un ORM/framework HTTP específico como si fuera la única opción posible** — se eligen herramientas ampliamente estándar (Node.js + TypeScript + Express + Prisma + PostgreSQL + Redis) precisamente porque son las que más probablemente ya existan como conocimiento operativo en cualquier VPS que ya corre Node-based tooling (n8n, Typebot son Node/TypeScript) — pero la guía de integración a Hostinger (`HOSTINGER_INTEGRATION_GUIDE.md`, entregable de una etapa posterior) empieza con diagnóstico de solo lectura, no con la suposición de que este stack encaja sin fricción.
- **No se confirma la versión ni compatibilidad de Evolution API con Coexistence** — sección 9 del pedido original, bloqueada sin acceso a la instalación real. Se documenta como riesgo abierto, con el contrato de eventos que Evolution *debería* emitir según su documentación pública, y con una prueba de contrato (no de versión real) contra eso.
- **No se asume que Postgres/Redis de Hostinger están disponibles para este nuevo backend tal cual** — el desarrollo local usa su propia instancia Dockerizada de Postgres/Redis, completamente aislada; conectar contra las instancias reales de Hostinger es una decisión posterior, explícitamente del usuario, con el primer paso de solo diagnóstico ya pedido en el punto 6 del ajuste de alcance.

## Cómo se comunican los endpoints públicos con este backend (requisito explícito del punto 5)

El frontend de Vercel (`/whatsapp/connect/`) seguirá llamando a `GET /api/meta/whatsapp/config` (sin cambios). El nuevo flujo de onboarding real (cuando el usuario apruebe la Etapa 2) necesitará que el navegador, tras `FB.login`, llame a un endpoint público de **este** backend (p. ej. `https://backend.maiatesta.com/whatsapp/onboarding/session` y `/complete`), no a Vercel — porque el intercambio de código por token y la persistencia ocurren aquí, no en Vercel. Eso implica:

- Un subdominio/puerto público para este backend, servido con HTTPS (Hostinger + reverse proxy, a definir en la guía de integración).
- CORS explícito y restringido a `https://www.maiatesta.com` únicamente — nunca `*`.
- Rate limiting en los endpoints públicos de onboarding (no solo en los webhooks) — el `onboarding/start` es el punto más expuesto a abuso, ya que se llama antes de cualquier autenticación de cliente.
- Postgres y Redis permanecen **sin exponer a Internet** — solo este backend (en la misma red privada de Hostinger) les habla directamente, tal como pide el punto 5 del pedido.

## Stack elegido y por qué

| Pieza | Elección | Razón |
|---|---|---|
| Runtime | Node.js 20 + TypeScript | Coherente con el resto del ecosistema del proyecto (Vite/React/TS ya en uso); n8n y Typebot también son Node — reduce la superficie de herramientas nuevas que el equipo de Hostinger tiene que aprender. |
| Framework HTTP | Express | Maduro, sin magia, fácil de auditar línea por línea — apropiado para un backend que maneja secretos y tokens de clientes. |
| Base de datos | PostgreSQL (vía Prisma) | Ya es parte del stack declarado (`PostgreSQL y Redis, según los servicios correspondientes`); Prisma da migraciones reproducibles y tipado end-to-end, exactamente lo que pide el punto 7 ("migraciones reproducibles"). |
| Caché/colas | Redis (vía BullMQ) | Ya es parte del stack declarado; BullMQ da colas persistentes reales para el webhook (punto 8: "la confirmación HTTP debe producirse únicamente después de garantizar la aceptación duradera del evento... por ejemplo mediante una cola persistente"). |
| Cifrado | AES-256-GCM (Node `crypto` nativo) | Cifrado autenticado, sin dependencias externas nuevas, misma filosofía que `server/meta/facebook/signed-request.ts` ya usa en el repo Vercel (HMAC nativo, sin librerías de terceros). |
| Contenedores | Docker Compose (dev/test) | Pedido explícito del usuario ("Utiliza Docker Compose cuando corresponda"); permite levantar Postgres+Redis+backend en un comando, sin tocar nada de Hostinger todavía. |

## Riesgo abierto — actualizado con el diagnóstico real de Hostinger

El diagnóstico ya realizado (2 vCPU, ~8 GB RAM, ~4.7 GB disponibles al medir, 69 GB libres, Evolution API 2.3.7 vía Docker Compose, Nginx Proxy Manager disponible, red compartida `npm_network`, Chatwoot en otro servidor sin asumir Docker) **confirma que la Alternativa B es viable** — hay margen real de recursos para un cuarto servicio Node.js persistente con los límites conservadores de `docker-compose.hostinger.yml` (0.5 vCPU / 512 MB para el backend, 0.5/512 MB para Postgres, 0.25/256 MB para Redis — ver ese archivo). Lo que sigue sin confirmarse porque requiere acceso real al VPS, no lectura de este repositorio:

- Que `maiatesta_whatsapp_isolated` (la red nueva y aislada de `docker-compose.hostinger.yml`) no colisione con subredes ya asignadas a `npm_network` u otros proyectos Docker del mismo host.
- Que el usuario del sistema que ejecutará `docker compose` tenga permiso para crear una red Docker nueva sin afectar las existentes.
- Que Nginx Proxy Manager pueda efectivamente alcanzar un contenedor de otro proyecto Docker Compose vía `docker network connect` (técnicamente sí, es un mecanismo estándar de Docker, pero no probado en este VPS específico).

Estos tres puntos son exactamente lo que `HOSTINGER_INTEGRATION_GUIDE.md` (entregable de la etapa final) pedirá diagnosticar de solo lectura, antes de la primera instalación real — nada de esto se ejecuta en esta revisión.

---

# Revisión de seguridad y arquitectura — 4 puntos previos a la Etapa 2

Esta sección documenta la respuesta a los cuatro puntos pedidos antes de aprobar el proceso real de autorización de Meta. Cada punto tiene código real y probado detrás, no solo la descripción — ver la sección "Evidencia" de cada uno.

## Punto 1 — Comunicación segura Vercel ↔ Hostinger

**Regla de fondo:** Vercel nunca habla con Postgres ni Redis directamente — ni hoy, ni en ningún diseño de este backend. Vercel solo hace peticiones HTTPS al backend de Hostinger, exactamente como ya hace hoy con sus propios 3 endpoints (`/api/meta/whatsapp/config` es la prueba de que el patrón "Vercel llama, backend responde JSON" ya funciona en producción).

**Mecanismo de autorización previa del tenant — token de invitación.** Implementado y probado en `src/access/invitationToken.ts` (9 pruebas, todas en verde). Responde directamente a "la página pública de conexión no debe permitir que alguien asocie arbitrariamente una cuenta de Meta con otro cliente":

1. Un administrador de Maiatesta (herramienta interna, fuera de esta revisión) llama `issueInvitationToken({ tenantId, adminUserId })` — genera un token HMAC-SHA256 firmado, con el mismo patrón que `server/meta/facebook/data-deletion-status-token.ts` del repo Vercel: `<firma>.<payload-base64url>`, verificación en tiempo constante, expiración de 7 días por defecto.
2. El token se entrega al cliente **fuera de banda** — email o WhatsApp enviado por Maiatesta. No existe ninguna forma de que un visitante del sitio genere uno por sí mismo; no hay endpoint público que emita tokens de invitación.
3. El cliente visita `/whatsapp/connect/?invite=<token>` en Vercel (la página ya existe; leer el query param es un cambio menor de la Etapa 2, no implementado todavía).
4. El frontend envía el token al backend de Hostinger. El backend llama `verifyInvitationToken(token, secret)` — el `tenantId` de la sesión de onboarding sale **del token verificado**, nunca de un campo del body que el navegador podría manipular. Un token para el tenant A no puede usarse para crear una sesión del tenant B — probado explícitamente (`rejects a tampered tenantId`).
5. Cada token tiene un `jti` único de un solo uso. Marcarlo como consumido requiere estado compartido (Redis) — eso se implementa junto con el endpoint real de la Etapa 2, no en este primitivo puro (que deliberadamente no toca red ni base de datos, para poder probarse de forma determinista).

**Autenticación/sesión para el resto de la comunicación pública:** los endpoints públicos de onboarding (`onboarding/start`, `/session`, `/complete` — todavía sin implementar, Etapa 2) se autentican por posesión del token de invitación o, en pasos posteriores del mismo flujo, por el `nonce` de la `OnboardingSession` ya creada (ver `prisma/schema.prisma`, `OnboardingSession.nonce`, único). No hay cookies de sesión de navegador en ningún punto de este flujo.

**CSRF:** no aplica en el sentido tradicional a estos endpoints — CSRF explota que el navegador adjunta cookies automáticamente entre orígenes; un modelo de token-en-el-body (como el de invitación, o Meta's propio `signed_request`) no tiene esa superficie. Si una futura Etapa 4+ agrega un panel de administración con sesión de cookie para el staff de Maiatesta, esa superficie sí necesitará tokens CSRF — se documenta como pendiente, no se implementa ahora porque no hay endpoint de admin con cookies en el alcance actual.

**Restricciones de acceso concretas para la Etapa 2** (documentadas aquí para que la implementación las siga, no inventadas en el momento):
- CORS: `Access-Control-Allow-Origin: https://www.maiatesta.com` exclusivamente, nunca `*`, nunca un patrón con comodín.
- Rate limiting en `onboarding/start` específicamente (es el endpoint alcanzable sin ningún estado previo) — `express-rate-limit` ya está en `package.json` desde la Etapa 1, sin configurar todavía.
- Todas las respuestas de error genéricas, sin distinguir "token inválido" de "token expirado" de "tenant no existe" en el mensaje público — mismo principio que `errorResponseForSignedRequestError` del repo Vercel.

## Punto 2 — Aislamiento multiempresa: dos capas independientes, no una

La preocupación era válida: `TenantScope` (Etapa 1) es una convención de código — nada impedía, hasta esta revisión, que un desarrollador futuro escribiera `prisma.phoneNumber.findMany()` sin pasar por `TenantScope` y obtuviera filas de todos los tenants. Eso ya no es cierto.

**Capa 2 nueva: Row-Level Security de Postgres**, migración `prisma/migrations/20260929180000_enable_row_level_security/migration.sql`. Resumen de lo que hace, con la explicación de por qué cada pieza es necesaria:

- Crea un rol `app_runtime` **que no es dueño de ninguna tabla** y tiene `NOBYPASSRLS` explícito. Esto es la pieza crítica que casi siempre se olvida: en Postgres, el dueño de una tabla y los superusuarios **ignoran RLS por defecto**, incluso con políticas activas. El servidor Express se conecta con este rol (`RUNTIME_DATABASE_URL`, `src/db/client.ts`) — las migraciones siguen usando el rol dueño (`DATABASE_URL`), que solo `prisma migrate` y `scripts/bootstrap-db-roles.sh` tocan.
- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` en las 9 tablas que son de un tenant (directa o transitivamente): `tenants`, `admin_users`, `onboarding_sessions`, `meta_authorizations`, `audit_logs` (filtro directo por `tenantId`), y `whatsapp_business_accounts`, `phone_numbers`, `credentials`, `integration_configs`, `message_events` (filtro por subquery que atraviesa la misma cadena `tenant → autorización → WABA → número` que ya usa `TenantScope`).
- Las políticas comparan contra `current_setting('app.current_tenant_id', true)` — una variable de **sesión de transacción**, fijada por `TenantScope.withSession()` (`src/tenancy/isolation.ts`) antes de cada operación vía `SELECT set_config('app.current_tenant_id', $1, true)` (el `true` final es el equivalente de `SET LOCAL`: se revierte solo al terminar la transacción, nunca se filtra a otra petición).
- **Fail-closed, no fail-open:** si nunca se fijó `app.current_tenant_id`, `current_setting(..., true)` devuelve `NULL`, y `tenantId = NULL` nunca es verdadero en SQL — así que una consulta sin contexto de tenant no ve absolutamente ninguna fila, no "todas por accidente".

**Identificador de Meta con unicidad global** (la otra mitad del Punto 2): `PhoneNumber.phoneNumberId` tiene `@unique` en `prisma/schema.prisma` — es el Phone Number ID real de Meta, global, y la restricción vive en la base de datos, no solo en la aplicación. `WhatsappBusinessAccount.wabaId` tiene la misma restricción a nivel de WABA. Esto significa que aunque `onboarding/complete` (Etapa 2, todavía sin escribir) tenga un bug y no verifique "este número ya está conectado a otro tenant" antes de insertar, el `INSERT` en sí mismo fallará con una violación de restricción única — la base de datos es la última línea de defensa, no solo la primera.

**Evidencia — 21 pruebas nuevas, todas ejecutadas, todas en verde:**

| Archivo | Qué prueba | Resultado |
|---|---|---|
| `tests/integration/tenant-isolation.test.ts` (ya existía, Etapa 1) | Capa 1 — `TenantScope` filtra correctamente vía `where` | 9/9 |
| `tests/integration/row-level-security.test.ts` (nuevo) | Capa 2 — RLS bloquea incluso una query **sin pasar por TenantScope en absoluto**, usando el rol `app_runtime` real | 7/7 |
| `tests/integration/key-rotation.test.ts` (nuevo, ver Punto 4) | La rotación de claves nunca mezcla credenciales entre tenants | incluido abajo |

El archivo de RLS es la prueba directa que se pidió: conecta como `app_runtime` (el mismo rol que usa producción), ejecuta `runtime.onboardingSession.findMany()` **sin ningún `where`**, y confirma que (a) sin contexto de tenant fijado, devuelve cero filas; (b) fijando el tenant A, devuelve solo las de A; (c) fijando B, solo las de B; (d) un `where: { tenantId: tenantB.id }` ejecutado mientras la sesión está fijada en A devuelve cero filas — RLS se aplica *después* del `where` de la aplicación, no en su lugar; (e) lo mismo para `phone_numbers`, la tabla alcanzada solo por relación; (f) el rol `app_runtime` no puede hacer `ALTER TABLE` ni `TRUNCATE` — confirma que los permisos son estrictamente DML.

## Punto 3 — Despliegue aislado en Hostinger

`docker-compose.hostinger.yml` (nuevo) — plantilla completa, no ejecutada contra el VPS real:

- Red propia `maiatesta_whatsapp_isolated`, **no** `npm_network`. Postgres y Redis solo tienen interfaz en esa red aislada.
- Postgres y Redis **sin ningún puerto publicado al host** (ni siquiera `127.0.0.1`) — solo alcanzables por el contenedor `backend` dentro de la misma red Docker.
- El backend se publica únicamente en `127.0.0.1:4000` del propio VPS — nunca en `0.0.0.0` — para que Nginx Proxy Manager (que corre en el mismo host) pueda alcanzarlo sin que el puerto quede expuesto a Internet directamente.
- Límites de recursos explícitos por servicio (`deploy.resources.limits`): backend 0.5 vCPU/512 MB, Postgres 0.5 vCPU/512 MB, Redis 0.25 vCPU/256 MB — conservador frente a los ~4.7 GB disponibles medidos, dejando margen para Evolution API y el resto del stack existente.
- La publicación pública vía HTTPS queda **documentada, no ejecutada**: el archivo explica los 4 pasos futuros (conectar *solo* el contenedor `backend` — nunca Postgres/Redis — a `npm_network` como red adicional, crear un Proxy Host nuevo en NPM apuntando a ese contenedor) sin modificar ninguna configuración de NPM ni de ningún servicio existente en este paso.

`.env.hostinger.example` documenta cada variable que ese compose necesita, sin ningún valor real — los secretos reales se generan en el propio VPS, nunca en esta conversación ni en git.

## Punto 4 — Protección y administración de credenciales

**Generación de la clave:** `openssl rand -hex 32` (64 caracteres hex / 256 bits) — igual que `META_DATA_DELETION_STATUS_SECRET` ya hace en el repo Vercel. Documentado en `.env.example`/`.env.hostinger.example`, nunca generado por este agente con un valor real destinado a producción.

**Almacenamiento:** variable de entorno del proceso backend en Hostinger, nunca en un archivo versionado — `.gitignore` del repositorio ya excluye `.env`, `.env.*` (con excepción explícita solo de los `*.example`, que no contienen secretos reales). El proceso backend es el único lugar que necesita leerla; Postgres/Redis nunca la ven (solo almacenan el ciphertext ya cifrado).

**Backup — la regla que evita que el cifrado sea teatro:** la clave de cifrado **nunca debe respaldarse junto con el dump de la base de datos**. Si ambos terminan en el mismo backup (mismo bucket, mismo disco, mismo archivo), cualquiera con acceso a ese backup tiene tanto el ciphertext como la clave — el cifrado deja de proteger nada. Recomendación concreta: el respaldo de la clave vive en un gestor de secretos separado (o, como mínimo, un archivo cifrado distinto con distinto control de acceso) del respaldo de la base de datos.

**Rotación — implementada y probada, no solo documentada.** `src/crypto/rotateKey.ts` + `scripts/rotate-encryption-key.ts` (CLI, toma las claves de variables de entorno, nunca de argumentos de línea de comandos — mismo principio que `bootstrap-db-roles.sh`). Cómo funciona: itera tenant por tenant (nunca una operación masiva sin scope), usando `TenantScope` para leer y re-escribir cada credencial — la rotación de claves respeta el mismo modelo de aislamiento que el resto del sistema, no es una vía de acceso especial. Una credencial que falla al descifrar con la clave vieja se reporta y se deja intacta, nunca se sobreescribe a ciegas ni aborta toda la rotación.

5 pruebas en `tests/integration/key-rotation.test.ts`, todas en verde: re-cifra correctamente todas las credenciales de todos los tenants; nunca mezcla credenciales entre tenants durante la rotación; reporta (sin lanzar excepción global) una credencial corrupta y la deja sin tocar; rechaza rotar a la misma clave; maneja el caso de cero tenants/credenciales sin error.

**Tokens fuera de logs/respuestas/archivos versionados:** `pino` en `src/index.ts` ya redacta headers de autorización/cookies; los handlers de la Etapa 2 (todavía sin escribir) deberán seguir el mismo patrón que `api/meta/facebook/deauthorize.ts` del repo Vercel — errores genéricos sin el valor que falló, nunca el código de autorización ni el token en el cuerpo de una respuesta de error.

## Resumen de pruebas — estado tras esta revisión

**40/40 pruebas pasando** (10 cifrado + 9 aislamiento por aplicación + 7 Row-Level Security + 5 rotación de clave + 9 token de invitación), más las verificaciones de la Etapa 1 (health endpoint end-to-end, `tsc --noEmit` limpio).

## Problemas pendientes tras esta revisión

- Los 3 puntos de la sección "Riesgo abierto" arriba (colisión de red Docker, permisos del usuario del sistema en el VPS, alcance real de `docker network connect` con NPM) — requieren acceso real al VPS, se resuelven en `HOSTINGER_INTEGRATION_GUIDE.md`.

---

# Etapa 2 — onboarding real, con 3 condiciones técnicas verificadas antes de implementar

Esta sección documenta la respuesta a las 3 condiciones exigidas antes de aprobar la Etapa 2, en el mismo formato de evidencia que la revisión anterior, y luego el resumen de lo implementado.

## Condición 1 — Compatibilidad con Meta Embedded Signup v4

**Verificado contra documentación oficial vigente** (fetch directo a `developers.facebook.com`, no memoria) — ver `docs/META_V4_COMPATIBILITY.md` para las 6 citas textuales completas. Resumen:

- `feature_type: 'whatsapp_business_app_onboarding'` sigue siendo el mecanismo correcto de v4 para Coexistence — **el frontend ya desplegado no necesita cambios**.
- El evento `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` del `postMessage` mantiene exactamente la forma que el código de Vercel ya espera.
- **Dos campos nuevos del modelo de cuentas v4** no estaban en el esquema original: `is_on_biz_app` (booleano) y `platform_type` (string) — se agregaron a `PhoneNumber` (migración `20260929180006_add_meta_v4_account_fields`) y se verifican explícitamente en `completeOnboarding` antes de persistir cualquier conexión (`src/onboarding/service.ts`, sección "Verificación explícita del modelo de cuentas v4").
- **Hallazgo no documentado previamente en este proyecto:** la documentación oficial advierte explícitamente contra llamar a la API de Deregister en un número en uso dual (Coexistence). Esto refuerza, con la fuente primaria de Meta, la decisión ya tomada en `src/meta/graphClient.ts` de que la clase `MetaGraphClient` **no tiene ningún método `/register` ni `/deregister`** — no por convención, por ausencia estructural. `tests/unit/graphClient.test.ts` incluye una prueba dedicada (`listGraphClientMethodNames` no contiene "register" en ningún nombre) que falla si alguien agrega ese método en el futuro sin darse cuenta de esta regla.
- `sessionInfoVersion` sigue sin confirmarse en documentación estática (Meta lo gatea detrás de una herramienta interactiva en el dashboard) — se mantiene el manejo defensivo ya existente en el repo de Vercel; queda en la lista de verificación empírica pendiente (Fase C).

**Garantía contra un registro/migración accidental:** `completeOnboarding` (`src/onboarding/service.ts`) nunca llama a ningún método de registro — no puede, porque `MetaGraphClient` no expone uno. Adicionalmente, si el número autorizado no tiene `is_on_biz_app: true`, la conexión se rechaza explícitamente (`NOT_COEXISTENCE`) **antes** de persistir nada, en vez de asumir éxito silenciosamente.

## Condición 2 — Seguridad transaccional de PostgreSQL bajo concurrencia real

**Las pruebas de una sola consulta ya existentes (`row-level-security.test.ts`) NO se consideraron suficientes**, tal como se pidió explícitamente. Prueba nueva: `tests/integration/concurrency.test.ts` (6 casos), diseñada específicamente para forzar reutilización real de conexiones físicas bajo contención:

- Un cliente Prisma separado con `connection_limit=3` (3 conexiones físicas compartidas) y **12 tenants** ejecutando operaciones simultáneas vía `Promise.all` — con solo 3 conexiones para 12 tenants concurrentes, el pool de Prisma *tiene* que reutilizar conexiones entre tenants distintos dentro de la ventana de la prueba; no es una simulación, es la condición real que se pidió probar.
- Se confirma, bajo esa contención real: lecturas concurrentes de 12 tenants nunca devuelven filas de otro tenant; creaciones concurrentes nunca escriben bajo el `tenantId` equivocado; actualizaciones y eliminaciones concurrentes respetan el mismo aislamiento; y una operación sin `app.current_tenant_id` fijado sigue fallando cerrado (cero filas) incluso mientras otras transacciones concurrentes sí tienen su contexto fijado — descartando que el fail-closed dependiera de que no hubiera contención.
- Esto prueba directamente lo pedido: "el contexto del tenant se establece dentro de la transacción correspondiente" (cada operación usa `TenantScope.withSession`, que fija `set_config` y ejecuta la consulta en la misma `$transaction`), "las consultas utilizan la conexión y transacción correctas" (forzado por `connection_limit=3`), "no existe contaminación entre solicitudes concurrentes", "las operaciones de lectura, creación, actualización y eliminación respetan el aislamiento", y "las consultas fallan de forma segura cuando falta el contexto".

## Condición 3 — Seguridad de los tokens de invitación, verificada antes de implementar los endpoints públicos

Cada propiedad exigida, con su prueba correspondiente:

| Propiedad exigida | Mecanismo | Prueba |
|---|---|---|
| Se emiten exclusivamente mediante operación administrativa autenticada | `issueInvitationTokenAsAdmin` exige `adminApiKey` comparado en tiempo constante contra `ADMIN_API_KEY` (env var independiente) | `tests/unit/invitationToken.test.ts` — 4 casos (`issueInvitationTokenAsAdmin`) |
| Caducidad limitada | TTL por defecto 7 días, configurable, verificado en `verifyInvitationToken` | `tests/unit/invitationToken.test.ts` — expiración + "acepta hasta el instante justo antes de expirar" |
| Identificador único verificable | `jti` de 16 bytes aleatorios por token, parte del payload firmado | `tests/unit/invitationToken.test.ts` — "cada token emitido tiene un jti único" |
| No pueden usarse más de una vez para iniciar conexiones independientes | `redeemInvitationToken` (Redis, `SET NX EX` atómico sobre el `jti`) | `tests/integration/invitation-token-redemption.test.ts` — incluye una prueba de **redención concurrente** (`Promise.allSettled`) que confirma que de N intentos simultáneos con el mismo token, exactamente uno tiene éxito |
| No permiten cambiar el tenant | El `tenantId` de la `OnboardingSession` creada en `/onboarding/start` sale única y exclusivamente del payload verificado del token — nunca de un campo del body | `tests/integration/onboarding-service.test.ts` — `startOnboarding crea una sesión scoped al tenant del token` |
| No exponen información sensible en logs | `pino` redacta headers de autorización/cookies; los mensajes de error de `/onboarding/start` son genéricos e idénticos sin importar la causa real (expirado, ya usado, firma inválida) | `tests/unit/invitationToken.test.ts` (mensajes de error) + `tests/integration/onboarding-routes.test.ts` (`un token con firma inválida produce EXACTAMENTE la misma respuesta HTTP que uno reutilizado`) |
| No permiten reutilizar una autorización anterior | Una `OnboardingSession` en estado `OPERATIONAL` rechaza tanto `recordSessionInfo` como un segundo `completeOnboarding` (`SESSION_ALREADY_COMPLETED`) | `tests/integration/onboarding-service.test.ts` — `una sesión ya completada rechaza un segundo intento` |

## Etapa 2 — resumen de lo implementado

**Flujo de dos tokens** (documentado en detalle en los comentarios de `src/access/sessionToken.ts`): el `invitationToken` (admin-emitido, Redis-de-un-solo-uso) resuelve el `tenantId` en `POST /onboarding/start` y entrega un `sessionToken` autoemitido de corta duración (`{tenantId, nonce}` firmado) que autoriza `POST /onboarding/session` y `POST /onboarding/complete`. Ningún paso del flujo necesita nunca una consulta a la base de datos sin contexto de tenant fijado (lo cual violaría Row-Level Security por diseño).

**`POST /onboarding/complete`** (`src/onboarding/service.ts:completeOnboarding`) hace, en orden, con manejo explícito de fallo en cada paso (la sesión se marca `RECOVERABLE_ERROR` con una razón específica, nunca se pierde silenciosamente):
1. Intercambia el código de autorización por un access token (`MetaGraphClient.exchangeCodeForAccessToken`).
2. Resuelve el usuario de Meta que autorizó (`getAuthorizingUserId`, vía `/me`).
3. Lista los números de la WABA autorizada y localiza el número esperado — por `phoneNumberId` explícito si el frontend lo reportó en el Session Info, o el único marcado `is_on_biz_app` en caso contrario (nunca "el primero de la lista" sin verificar).
4. Rechaza explícitamente (`NOT_COEXISTENCE`) si el número encontrado no tiene `is_on_biz_app: true` — la garantía central de que este flujo nunca completa una conexión que en realidad migró el número.
5. Persiste de forma transaccional (`TenantScope.metaAuthorizations().completeAuthorization`): autorización + WABA + número + credencial cifrada (AES-256-GCM, misma clave que Etapa 1). Si el número ya pertenece a otro tenant, la restricción `@unique` de la base de datos lo rechaza y se traduce a un error genérico (`PhoneAlreadyConnectedError`) que nunca revela a qué tenant pertenece.
6. Suscribe la app a los eventos de la WABA (`subscribeAppToWaba`) — un fallo aquí no deshace la conexión ya persistida (es recuperable, no destructivo).

**Archivos nuevos:** `src/meta/graphClient.ts`, `src/access/invitationTokenStore.ts`, `src/access/sessionToken.ts`, `src/redis/client.ts`, `src/onboarding/service.ts`, `src/onboarding/routes.ts`, `docs/META_V4_COMPATIBILITY.md`, más las migraciones `20260929180006_add_meta_v4_account_fields`, y `tests/unit/graphClient.test.ts`, `tests/integration/concurrency.test.ts`, `tests/integration/invitation-token-redemption.test.ts`, `tests/integration/onboarding-service.test.ts`, `tests/integration/onboarding-routes.test.ts`.

**Archivos modificados:** `src/tenancy/isolation.ts` (nuevo `onboardingSessions().updateByNonce`, `metaAuthorizations().completeAuthorization`, `PhoneAlreadyConnectedError`), `src/access/invitationToken.ts` (`issueInvitationTokenAsAdmin`), `src/config/env.ts` (`getAdminApiKey`, `getInvitationTokenSecret`), `src/index.ts` (monta el router de onboarding), `prisma/schema.prisma` (`isOnBizApp`, `platformType`), `.env.example`, `.env.hostinger.example`.

## Qué sigue sin verificarse contra la API real de Meta (simulada únicamente hasta ahora)

- La forma exacta de la respuesta de `/oauth/access_token`, `/me`, `/{waba-id}/phone_numbers` y `/{waba-id}/subscribed_apps` — verificada contra la documentación pública y contra respuestas simuladas en las pruebas, nunca contra una llamada real.
- El objeto `extras` exacto que entrega `FB.login()` en v4 — ya documentado como una limitación conocida del repo de Vercel, no resuelta por esta etapa (Meta lo gatea detrás de una herramienta interactiva del dashboard).
- Que el popup real de Meta, para una app en modo Coexistence, efectivamente ofrezca esa opción y no una migración — sigue siendo la Fase C ya documentada, prerrequisito del propietario, no de ingeniería.

## Riesgos pendientes explícitos

- Rate limiting en `/onboarding/start` usa un límite fijo (20 solicitudes / 15 min) sin distinguir por IP de forma más granular que el `keyGenerator` por defecto de `express-rate-limit` — suficiente para esta etapa, pero debe revisarse si el patrón de tráfico real de Hostinger lo justifica.
- `sessionInfoVersion` (campo del Session Info del SDK de Meta) sigue sin confirmarse contra documentación oficial estática — se mantiene el manejo ya existente en el repo Vercel, sin cambios de esta etapa.
- Ningún endpoint de esta etapa está desplegado en Hostinger ni conectado a Vercel — `LOCAL TESTS PASSED`, `HOSTINGER VALIDATION PENDING`, `META COEXISTENCE TEST PENDING` (ver README.md).
- La rotación de clave (`rotateEncryptionKey`) no está expuesta como endpoint HTTP — es deliberadamente solo CLI, para que rotar una clave de producción requiera acceso directo al servidor, no una petición de red.
