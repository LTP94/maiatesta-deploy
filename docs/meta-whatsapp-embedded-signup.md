# Meta WhatsApp Embedded Signup — infrastructure prep

## Estado actual

**FASE B — Facebook JavaScript SDK + Coexistence en el frontend, sin backend.**

El Facebook JavaScript SDK, `FB.init`, `FB.login` (contrato de Coexistence) y el listener de `window.postMessage` **sí están implementados** en `/whatsapp/connect/`. Sigue sin existir intercambio de código por token, sin llamadas a Meta Graph API desde el servidor, sin persistencia de ningún dato de Meta, y sin webhook. El único endpoint backend nuevo de esta fase (`GET /api/meta/whatsapp/config`) sirve exclusivamente los tres valores públicos (`appId`, `configurationId`, `graphApiVersion`) que el SDK necesita — no contiene secretos ni lógica de negocio.

**Punto de parada obligatorio de esta fase:** el código de autorización (`authorization code`) que devuelve `FB.login` se observa en memoria únicamente para confirmar que llegó (booleano `codeReceived`), nunca se registra en logs, nunca se persiste, nunca se envía a ningún backend. No existe todavía `POST /api/meta/whatsapp/onboarding/complete` ni ningún otro endpoint que lo reciba — eso es Fase D, explícitamente diferida hasta que (a) la prueba manual del popup real de Meta (Fase C, ver más abajo) confirme que Coexistence aparece como opción, y (b) se apruebe por separado una arquitectura de persistencia (hoy no existe base de datos, ORM ni librería de autenticación en este repositorio).

### Investigación de versión (v2 vs v4)

La documentación de Meta indica que **Embedded Signup v2 se retira el 15 de octubre de 2026**; **v4 es la versión vigente desde octubre de 2025**. Este repositorio usa el contrato v4. Fuente consultada directamente en la documentación oficial de Meta for Developers (WhatsApp Embedded Signup / Coexistence), acceso 2026-09-02.

No se pudo confirmar con certeza absoluta, a partir de la página genérica de v4 consultada, si `featureType`/`sessionInfoVersion` dentro de `extras` siguen siendo necesarios en v4 para el flujo específico de Coexistence (la página genérica de v4 solo muestra `extras: { setup: {} }`, sin `featureType`; la documentación específica de Coexistence no confirma inequívocamente que se haya eliminado). Por eso se mantienen ambos campos de forma **defensiva** — un parámetro extra e innecesario es de menor riesgo que omitir uno que Meta todavía requiera. La prueba manual de Fase C es la que confirma empíricamente si son necesarios.

```js
FB.login(fbLoginCallback, {
  config_id: '<META_EMBEDDED_SIGNUP_CONFIG_ID>',
  response_type: 'code',
  override_default_response_type: true,
  extras: {
    setup: {},
    featureType: 'whatsapp_business_app_onboarding',
    sessionInfoVersion: '3',
  },
});
```

`FB.init({ appId, autoLogAppEvents: true, xfbml: true, version })` y la forma del evento `postMessage` de finalización de sesión (`type: 'WA_EMBEDDED_SIGNUP'`, `event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'`, `version: 3`, `data.waba_id`) sí están confirmados sin ambigüedad por la documentación oficial.

### Modelo de estado del frontend (canales en carrera, no lineal)

El callback de `FB.login` (entrega el código de autorización) y el evento `postMessage` de Coexistence (confirma la sesión) son dos canales asíncronos independientes que pueden llegar **en cualquier orden**. `src/utils/metaEmbeddedSignup.ts` implementa un acumulador (`SignupAttempt`, con banderas `sessionFinished`/`codeReceived`/etc.) en lugar de una máquina de estados lineal, para que ambos órdenes de llegada converjan correctamente en `READY_FOR_BACKEND`. `READY_FOR_BACKEND` significa **"Meta confirmó Coexistence y entregó un código de autorización"** — no significa que WhatsApp esté conectado; la UI nunca dice "WhatsApp conectado" en esta fase, únicamente que la autorización con Meta se completó correctamente.

El listener de `message` valida `event.origin` contra una lista exacta (`https://www.facebook.com`, `https://web.facebook.com`, sin sufijos ni comodines) antes de procesar cualquier payload.

### Fase C — verificación manual (no automatizable, pendiente)

Antes de tocar cualquier código de backend nuevo, el propietario debe abrir `https://www.maiatesta.com/whatsapp/connect/` en producción, hacer clic en "Conectar con Meta" y confirmar en el popup real de Meta que:
- Se ofrece explícitamente conectar la cuenta de **WhatsApp Business App existente** (Coexistence), no una migración ni un número nuevo.
- No se solicita migración del número.
- El evento de finalización observado es el de Coexistence (`FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`).
- El código de autorización se observa, pero DevTools confirma cero requests a cualquier endpoint de `/onboarding/` y el código nunca aparece en el HTML/consola visible.

Verdict de esta fase tras el deploy: `READY FOR META EMBEDDED SIGNUP MANUAL TEST`. Tras una Fase C exitosa: `PHASE C COEXISTENCE POPUP VERIFIED` — que **tampoco** autoriza Fase D por sí sola; la arquitectura de persistencia se decide y aprueba por separado.

## Objetivo

Preparar, dentro de la arquitectura existente (Vite 5 + React 18 SSR/SSG, sin framework de routing dedicado), las URLs públicas y estables que se usarán en la siguiente fase para integrar el flujo oficial de Meta WhatsApp Embedded Signup con **WhatsApp Business App Coexistence**.

## Rutas implementadas en esta fase

| Ruta | Propósito | Estado |
| --- | --- | --- |
| `https://www.maiatesta.com/whatsapp/connect/` | Página pública que inicia Embedded Signup. Botón "Conectar con Meta" habilitado una vez que el SDK carga; abre `FB.login` con el contrato de Coexistence. | Implementada, con Meta SDK (Fase B) |
| `https://www.maiatesta.com/whatsapp/connect/callback/` | URI técnica de retorno reservada para "Valid OAuth Redirect URIs" de Facebook Login for Business. No lee query params, no procesa códigos, no llama a Meta ni a Evolution. | Implementada, contenido estático |
| `https://www.maiatesta.com/api/meta/whatsapp/config` | `GET` — sirve `{ appId, configurationId, graphApiVersion, requestedFlow }`. Sin secretos, `Cache-Control: no-store`. | Implementada |

Las dos rutas de página (no el endpoint de config):
- Devuelven HTTP 200 vía el mismo pipeline de prerender (`scripts/prerender.mjs`) que el resto del sitio — no requieren cambios de Vercel ni de DNS.
- Tienen `<meta name="robots" content="noindex, nofollow">` (ver mecanismo abajo).
- Están **excluidas** de `dist/sitemap.xml`.
- Reutilizan el layout `service-page-hero` / `Header` / `Footer` existente — visualmente indistinguibles del resto del sitio.

### Mecanismo de noindex (nuevo)

Antes de esta fase no existía forma de marcar una ruta individual como `noindex` — `index.html` traía `<meta name="robots" content="index, follow">` hardcodeado y `scripts/prerender.mjs` nunca lo tocaba. Se añadió:
- Un campo opcional `robots` en el objeto que devuelve `getRouteSeo()` (`src/entry-server.tsx`).
- Un reemplazo más en `injectHead()` (`scripts/prerender.mjs`) que usa `seo.robots ?? 'index, follow'`, así que el comportamiento de todas las demás rutas no cambia.
- Una lista `noindexRoutes` exportada desde `entry-server.tsx`, usada tanto para generar el HTML como para filtrar `sitemap.xml`.

## Verificación de trailing slash (pendiente, post-deploy)

Meta usa *Strict Mode* para las Redirect URIs — `/whatsapp/connect/callback` y `/whatsapp/connect/callback/` **no son intercambiables**. El pipeline de prerender de este sitio siempre genera archivos como `dist/whatsapp/connect/callback/index.html`, lo cual sugiere que la versión canónica con slash final es la que Vercel servirá sin redirección, pero esto **debe confirmarse en producción** después del deploy, antes de registrar la URL en Meta:

```bash
curl -I https://www.maiatesta.com/whatsapp/connect
curl -I https://www.maiatesta.com/whatsapp/connect/
curl -I https://www.maiatesta.com/whatsapp/connect/callback
curl -I https://www.maiatesta.com/whatsapp/connect/callback/
```

La URL exacta que responda `200` (o a la que redirijan las demás) es la que se registrará en Meta Developers.

## Auditoría de páginas legales (Meta App Review las requiere)

| Documento | Estado | URL |
| --- | --- | --- |
| Privacy Policy | **EXISTE** | `https://www.maiatesta.com/politica-de-privacidad/` |
| Terms of Service | **NO EXISTE** | propuesta: `https://www.maiatesta.com/terminos/` |
| User Data Deletion Instructions | **NO EXISTE** | propuesta: `https://www.maiatesta.com/eliminacion-de-datos/` |

Por instrucción explícita de esta tarea, **no se creó contenido legal nuevo** (Terms, Data Deletion) — crear esas páginas requiere texto legal autorizado, fuera del alcance de esta fase. La Privacy Policy existente ya cubre WhatsApp Business y tratamiento de datos de forma genérica; se reutilizará su URL actual en la configuración de Meta, sin duplicados.

## Arquitectura

```text
Usuario administrador del cliente
        ↓
/whatsapp/connect/                                    ← implementado (Fase B)
        ↓
Facebook JavaScript SDK (connect.facebook.net/en_US/sdk.js)   ← implementado
        ↓
FB.login()  →  Meta Embedded Signup (featureType: whatsapp_business_app_onboarding)
        ↓
response_type: "code", override_default_response_type: true   ← implementado
        ↓
Código de autorización observado en memoria del navegador,
nunca registrado/persistido/enviado                    ← implementado, y es el
                                                           punto de parada de esta fase
        ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  (todo lo siguiente es Fase D+, NO implementado)
        ↓
Backend Maiatesta (server-side, nunca frontend)
        ↓
Meta Graph API — code/token exchange, /{WABA_ID}/phone_numbers,
                 /{WABA_ID}/subscribed_apps
        ↓
Webhook Maiatesta  →  Evolution  →  Chatwoot  →  Typebot  →  n8n  →  IA
```

### Endpoints backend reservados (nombres únicamente — NO implementados)

| Endpoint | Método | Función futura |
| --- | --- | --- |
| `/api/meta/whatsapp/onboarding/start` | `POST` | Crea una sesión de onboarding efímera (id, timestamp, nonce/state) antes de abrir Meta. |
| `/api/meta/whatsapp/onboarding/session` | `POST` | Recibe el Session Info (`business_id`, `waba_id`, `phone_number_id`) que llega vía `window.postMessage`, separado del `authorization code` de `FB.login`. |
| `/api/meta/whatsapp/onboarding/complete` | `POST` | Server-side: intercambia el `authorization code` por un token en Graph API, valida WABA/teléfono/permisos, almacena secretos cifrados. |
| `/api/meta/whatsapp/webhook` | `GET`/`POST` | `GET` para la verificación de Meta; `POST` para eventos de WhatsApp. Debe existir un router propio de Maiatesta antes de reenviar a Evolution — **no apuntar Evolution directamente como receptor del webhook en el primer piloto**. |

**Importante — Coexistence y `/register`:** el endpoint `/{PHONE_NUMBER_ID}/register` de Graph API **no debe llamarse automáticamente**. El número del cliente usa actualmente WhatsApp Business App; cualquier llamada que registre el número para Cloud API podría romper esa app. Debe existir un GO/NO-GO manual antes de esa llamada específica.

### Meta/Facebook lifecycle callbacks — IMPLEMENTADO

A diferencia de los endpoints de la tabla anterior (que siguen siendo solo nombres reservados), estos dos **sí están implementados y desplegados**:

| Endpoint | Método | Estado |
| --- | --- | --- |
| `https://www.maiatesta.com/api/meta/facebook/deauthorize` | `POST` | Implementado. Verifica el `signed_request` de Meta (HMAC-SHA256, comparación en tiempo constante) antes de procesar nada. |
| `https://www.maiatesta.com/api/meta/facebook/data-deletion` | `POST` | Implementado. Misma verificación. Devuelve `url` + `confirmation_code` deterministas. |
| `https://www.maiatesta.com/api/meta/facebook/data-deletion/status` | `GET` | Implementado. Página HTML mínima, sin JS ni login, que muestra el estado de una solicitud a partir de un token firmado y opaco. |

**Distinción obligatoria — no son la misma URL:**
- `https://www.maiatesta.com/eliminacion-de-datos/` es la página pública de instrucciones para personas (existe desde una fase anterior, sin cambios).
- `https://www.maiatesta.com/api/meta/facebook/data-deletion` es el callback máquina-a-máquina que Meta invoca automáticamente. Ninguna reemplaza a la otra; ambas se mantienen.

Actualmente Maiatesta no almacena tokens, perfiles de Meta, conexiones WABA, Phone Number IDs ni sesiones OAuth — por eso ambos callbacks responden con un resultado honesto de "nada que revocar/eliminar" (`NO_STORED_AUTHORIZATION_DATA`, `records_deleted: 0`) en lugar de simular una acción sobre datos que no existen.

#### P0 — antes de persistir cualquier dato de Meta

```text
BEFORE PERSISTING ANY META AUTHORIZATION DATA:

1. Connect the deauthorize callback to the real authorization storage.
2. Connect the data-deletion callback to the real Meta-user data storage.
3. Implement tenant-safe mapping:
   Meta authorizer -> authorization -> tenant -> WABA -> phone numbers
4. Test multi-tenant isolation end-to-end.
5. NEVER implement deleteTenant(metaUserId) as a reaction to Deauthorize
   or Data Deletion — an app-scoped Meta user is not the same thing as a
   tenant, a WABA, a phone number, or a business.
```

Este P0 debe revisarse cuando se construya el almacenamiento real de Embedded Signup — antes de que el primer onboarding de cliente persista un usuario de Meta, un token, o una conexión WABA/número.

#### Dos estados de release (no uno solo)

1. **`READY FOR META CALLBACK REGISTRATION`** — los endpoints existen en producción, rechazan correctamente cualquier request inválida o mal firmada, y una prueba positiva con el secreto real (ejecutada por el propietario, nunca compartida con el agente) confirma que una firma válida es aceptada. En este punto es seguro registrar las URLs en Meta.
2. **`META CALLBACKS LIVE VERIFIED`** — ocurre después, y es responsabilidad exclusiva del propietario: registrar las URLs en el Meta App Dashboard, y luego disparar eventos reales de lifecycle (deauthorize/data-deletion) mediante una cuenta de prueba de Meta, confirmando que las solicitudes reales de Meta llegan y se procesan correctamente en producción.

No se puede exigir una solicitud real de Meta como condición para la primera fase — Meta no puede llamar a una URL que todavía no conoce.

### Vercel Functions — compatibilidad (auditoría + smoke test real)

El sitio usa Vite (no Next.js) con salida estática en `dist/`. Vercel soporta un directorio `/api` en la raíz del repositorio como Serverless Functions de forma **independiente del framework de frontend** (convención de plataforma, no de Next.js) — esto no requiere cambiar el `buildCommand` ni el `outputDirectory` actuales, y `vercel.json` de este repo no define `functions`/`builds` que lo restrinjan.

**Veredicto: VERIFIED empíricamente en producción (2026-08-28).** Se desplegó `api/meta/health.ts` (Web Handler estándar — `export function GET()` devolviendo `Response.json(...)`, sin `@vercel/node` ni dependencias nuevas) y se confirmó en `https://www.maiatesta.com/api/meta/health` que Vercel lo ejecuta como una Function real, coexistiendo con el sitio estático sin alterar build, prerender, sitemap, páginas legales ni `/whatsapp/connect/`. Evidencia: `x-vercel-cache: MISS` en cada request, `cache-control: no-store` respetado, `timestamp` distinto entre dos llamadas consecutivas, y `POST` devuelto automáticamente como `405` por el runtime de Vercel sin código adicional (solo se exportó `GET`). `dist/api/` nunca se generó localmente — confirma que la Function no vive en el build estático.

Health endpoint: `https://www.maiatesta.com/api/meta/health`

**Todavía NO existe ninguna lógica de Meta** en este endpoint ni en el repositorio: sin `FB.init`, sin `FB.login`, sin App ID, sin Configuration ID, sin OAuth, sin intercambio de tokens, sin webhook, sin llamadas a Meta Graph API. Es únicamente la prueba de que el runtime server-side funciona en este dominio, previo a implementar cualquier endpoint real de la Fase 2. Verificación reproducible: `npm run check:meta-health -- https://www.maiatesta.com`.

## Variables de entorno (solo nombres — nunca valores)

| Variable | Alcance | Nota |
| --- | --- | --- |
| `META_APP_ID` | Frontend permitido | **Implementada.** Público por diseño (Meta lo expone en `FB.init`). Servida vía `GET /api/meta/whatsapp/config`, leída por `server/meta/whatsapp/config.ts`. |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Frontend permitido | **Implementada.** Público por diseño. Mismo endpoint/loader que `META_APP_ID`. |
| `META_GRAPH_API_VERSION` | Frontend permitido, no es secreto | **Implementada.** Formato validado (`^v\d{2,3}\.0$`, p. ej. `v25.0`). Mismo endpoint/loader. Configurable para no quedar hardcodeada en componentes frontend. |
| `META_APP_SECRET` | **Backend-only** | Nunca debe llegar al bundle del frontend. Consumido por los callbacks de deauthorize/data-deletion (fase anterior). En Preview: valor de prueba desechable. En Production: el secreto real de Meta, nunca compartido con el agente. |
| `META_DATA_DELETION_STATUS_SECRET` | **Backend-only** | Independiente de `META_APP_SECRET` (nunca derivado de él, para poder rotarlos por separado). Debe ser exactamente 64 caracteres hexadecimales (32 bytes / 256 bits), p. ej. `openssl rand -hex 32`. |
| `META_PUBLIC_BASE_URL` | Backend-only, no es secreto | Origen exacto usado para construir la URL de estado devuelta a Meta — nunca se deriva del `Host` de la request entrante. Preview: el origen `https://<preview>.vercel.app` real de ese deployment. Production: `https://www.maiatesta.com`. |
| `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` | **Backend-only, futura** | Secreto generado por Maiatesta, no una URL — nunca en git, frontend, logs o documentación con valor real. No usada todavía (Fase D+, webhook). |
| `META_TOKEN_ENCRYPTION_KEY` | **Backend-only, futura** | No usada todavía (Fase D+, persistencia de tokens). |
| `META_ONBOARDING_SESSION_SECRET` | **Backend-only, futura** | No usada todavía (Fase D+, sesiones de onboarding). |

No se crearon valores de ejemplo ni placeholders que parezcan credenciales reales.

## CSP

El bloque de headers `/whatsapp/(.*)` en `vercel.json` — antes idéntico al de `/servicios/(.*)` y `/guias/(.*)` — ahora tiene dos adiciones, **scoped únicamente a este bloque**, sin cambios en ningún otro `source` de `vercel.json`:

```text
script-src  += https://connect.facebook.net   (carga del Facebook JavaScript SDK)
frame-src   += https://www.facebook.com       (popup de Embedded Signup)
```

`connect-src` no se amplió — `GET /api/meta/whatsapp/config` es same-origin (`'self'`, ya presente) y esta fase no hace ninguna llamada de red del cliente a `graph.facebook.com`. Si la Fase C revela una violación real de CSP capturada en DevTools, se ampliará entonces con evidencia, nunca a priori. Principio de mínimo privilegio aplicado: **no se usó** `*.facebook.com`, `*`, ni `unsafe-eval`.

## URLs que se configurarán en Meta Developers (fase posterior, no ahora)

| Campo en Meta | Valor |
| --- | --- |
| App Domains | `maiatesta.com`, `www.maiatesta.com` |
| Allowed Domains for the JavaScript SDK | `www.maiatesta.com` (nunca `*.maiatesta.com` ni un preview de Vercel) |
| Valid OAuth Redirect URI | URL exacta confirmada por curl tras el deploy (ver sección de trailing slash) |
| Privacy Policy URL | `https://www.maiatesta.com/politica-de-privacidad/` |
| Terms of Service URL | pendiente de creación — `https://www.maiatesta.com/terminos/` |
| User Data Deletion Instructions URL | pendiente de creación — `https://www.maiatesta.com/eliminacion-de-datos/` |
| WhatsApp Webhook Callback URL | fase posterior — `https://www.maiatesta.com/api/meta/whatsapp/webhook` |
| Deauthorize Callback URL | implementado, **aún no registrado en Meta** — `https://www.maiatesta.com/api/meta/facebook/deauthorize` |
| Data Deletion Request URL | implementado, **aún no registrado en Meta** — `https://www.maiatesta.com/api/meta/facebook/data-deletion` |

## No usar en producción

- `*.vercel.app` como Redirect URI estable.
- `localhost` en configuración de producción.
- `http://` (todo debe ser `https://`).
- `*.maiatesta.com` como wildcard de OAuth URI.
- `api.kipuxbot.com` directamente como URL de Embedded Signup.
- Evolution directamente como callback OAuth o receptor inicial de Coexistence sin validar antes los eventos.

## No DNS changes required

`www.maiatesta.com` ya está conectado y funcionando en Vercel. Las rutas nuevas son parte del mismo build estático — no se modificó Namecheap, no se crearon registros CNAME, no se creó `meta.maiatesta.com`, no se cambiaron nameservers ni el dominio principal.
