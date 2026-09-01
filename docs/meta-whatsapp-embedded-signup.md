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

## Variables de entorno futuras (solo nombres — nunca valores)

| Variable | Alcance | Nota |
| --- | --- | --- |
| `META_APP_ID` | Frontend permitido | Público por diseño (Meta lo expone en `FB.init`). |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Frontend permitido | Público por diseño. |
| `META_APP_SECRET` | **Backend-only** | Nunca debe llegar al bundle del frontend. Ahora consumido realmente por los callbacks de deauthorize/data-deletion. En Preview: valor de prueba desechable. En Production: el secreto real de Meta, nunca compartido con el agente. |
| `META_DATA_DELETION_STATUS_SECRET` | **Backend-only** | Nuevo. Independiente de `META_APP_SECRET` (nunca derivado de él, para poder rotarlos por separado). Debe ser exactamente 64 caracteres hexadecimales (32 bytes / 256 bits), p. ej. `openssl rand -hex 32`. |
| `META_PUBLIC_BASE_URL` | Backend-only, no es secreto | Origen exacto usado para construir la URL de estado devuelta a Meta — nunca se deriva del `Host` de la request entrante. Preview: el origen `https://<preview>.vercel.app` real de ese deployment. Production: `https://www.maiatesta.com`. |
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
