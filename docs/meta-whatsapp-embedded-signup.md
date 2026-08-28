# Meta WhatsApp Embedded Signup — infrastructure prep

## Estado actual

**FASE 1 — ENTRY PAGE ONLY.**

Meta Embedded Signup todavía **NO** está conectado. No existe Facebook JavaScript SDK, `FB.init`, `FB.login`, App ID, Configuration ID, OAuth, intercambio de tokens, webhook, ni ninguna llamada a Meta Graph API en este repositorio. Esta fase preparó únicamente las rutas web públicas y la documentación de la arquitectura futura.

## Objetivo

Preparar, dentro de la arquitectura existente (Vite 5 + React 18 SSR/SSG, sin framework de routing dedicado), las URLs públicas y estables que se usarán en la siguiente fase para integrar el flujo oficial de Meta WhatsApp Embedded Signup con **WhatsApp Business App Coexistence**.

## Rutas implementadas en esta fase

| Ruta | Propósito | Estado |
| --- | --- | --- |
| `https://www.maiatesta.com/whatsapp/connect/` | Página pública que iniciará Embedded Signup. Botón "Conectar con Meta" **deshabilitado**. | Implementada, sin Meta SDK |
| `https://www.maiatesta.com/whatsapp/connect/callback/` | URI técnica de retorno reservada para "Valid OAuth Redirect URIs" de Facebook Login for Business. No lee query params, no procesa códigos, no llama a Meta ni a Evolution. | Implementada, contenido estático |

Ambas rutas:
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

## Arquitectura futura (NO implementada)

```text
Usuario administrador del cliente
        ↓
/whatsapp/connect/
        ↓
Facebook JavaScript SDK (connect.facebook.net/en_US/sdk.js)
        ↓
FB.login()  →  Meta Embedded Signup (featureType: whatsapp_business_app_onboarding)
        ↓
response_type: "code", override_default_response_type: true
        ↓
/whatsapp/connect/callback/  (Valid OAuth Redirect URI)
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
| `/api/meta/data-deletion` | `POST` | Solo si App Review exige un callback automático de eliminación; el enfoque inicial es la página pública de instrucciones. |

**Importante — Coexistence y `/register`:** el endpoint `/{PHONE_NUMBER_ID}/register` de Graph API **no debe llamarse automáticamente**. El número del cliente usa actualmente WhatsApp Business App; cualquier llamada que registre el número para Cloud API podría romper esa app. Debe existir un GO/NO-GO manual antes de esa llamada específica.

### Vercel Functions — compatibilidad (auditoría + smoke test real)

El sitio usa Vite (no Next.js) con salida estática en `dist/`. Vercel soporta un directorio `/api` en la raíz del repositorio como Serverless Functions de forma **independiente del framework de frontend** (convención de plataforma, no de Next.js) — esto no requiere cambiar el `buildCommand` ni el `outputDirectory` actuales, y `vercel.json` de este repo no define `functions`/`builds` que lo restrinjan.

**Veredicto: pendiente de confirmación en producción tras este deploy.** Se implementó `api/meta/health.ts` (Web Handler estándar — `export function GET()` devolviendo `Response.json(...)`, sin `@vercel/node` ni dependencias nuevas) como smoke test. Esta sección se actualizará con el resultado empírico real (VERIFIED/NOT VERIFIED) inmediatamente después del deployment y la verificación por `curl`.

Health endpoint: `https://www.maiatesta.com/api/meta/health`

**Todavía NO existe ninguna lógica de Meta** en este endpoint ni en el repositorio: sin `FB.init`, sin `FB.login`, sin App ID, sin Configuration ID, sin OAuth, sin intercambio de tokens, sin webhook, sin llamadas a Meta Graph API. Es únicamente la prueba de que el runtime server-side funciona en este dominio, previo a implementar cualquier endpoint real de la Fase 2. Verificación reproducible: `npm run check:meta-health -- https://www.maiatesta.com`.

## Variables de entorno futuras (solo nombres — nunca valores)

| Variable | Alcance | Nota |
| --- | --- | --- |
| `META_APP_ID` | Frontend permitido | Público por diseño (Meta lo expone en `FB.init`). |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Frontend permitido | Público por diseño. |
| `META_APP_SECRET` | **Backend-only** | Nunca debe llegar al bundle del frontend. |
| `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` | **Backend-only** | Secreto generado por Maiatesta, no una URL — nunca en git, frontend, logs o documentación con valor real. |
| `GRAPH_VERSION` | Backend-only | Configurable, no debe quedar hardcodeada en componentes frontend. |

No se crearon valores de ejemplo ni placeholders que parezcan credenciales reales.

## CSP futuro

`vercel.json` ya incluye un bloque de headers para `/whatsapp/(.*)` (idéntico al de `/servicios/(.*)` y `/guias/(.*)`, mismas políticas, sin dominios nuevos). Cuando se integre el Facebook JavaScript SDK en la siguiente fase, el CSP deberá ampliarse — como mínimo se investigará (con DevTools/E2E real, no a priori) qué directivas exactas necesitan:

```text
connect.facebook.net   (script-src)
graph.facebook.com     (connect-src)
www.facebook.com       (frame-src, si aplica)
```

Aplicar principio de mínimo privilegio: **no usar** `*.facebook.com`, `*`, ni `unsafe-eval` como solución genérica.

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

## No usar en producción

- `*.vercel.app` como Redirect URI estable.
- `localhost` en configuración de producción.
- `http://` (todo debe ser `https://`).
- `*.maiatesta.com` como wildcard de OAuth URI.
- `api.kipuxbot.com` directamente como URL de Embedded Signup.
- Evolution directamente como callback OAuth o receptor inicial de Coexistence sin validar antes los eventos.

## No DNS changes required

`www.maiatesta.com` ya está conectado y funcionando en Vercel. Las rutas nuevas son parte del mismo build estático — no se modificó Namecheap, no se crearon registros CNAME, no se creó `meta.maiatesta.com`, no se cambiaron nameservers ni el dominio principal.
