# Integración Vercel ↔ backend de Coexistence

Fecha: 2026-09-29. Estado: **IMPLEMENTADA Y PROBADA LOCALMENTE / NO DESPLEGADA**.

No se modificó Vercel, Hostinger, DNS, Nginx Proxy Manager ni Meta. No se
conectaron cuentas o números reales y no se hizo merge a `main`.

## Diagnóstico y decisión

Los endpoints necesarios ya existían y se reutilizaron sin duplicarlos:

- `POST /onboarding/start` consume una invitación de un uso y deriva el tenant
  exclusivamente del token firmado;
- `POST /onboarding/session` guarda Session Info bajo la sesión firmada;
- `POST /onboarding/complete` intercambia el authorization code en el backend,
  verifica Coexistence y persiste la autorización cifrada.

El frontend anterior descartaba el valor del authorization code y los datos
del evento Session Info. Ahora un coordinador en memoria acepta ambos canales
en cualquier orden, serializa las operaciones y garantiza `/session` antes de
`/complete`.

## Transporte y ciclo de vida seguro

1. La invitación se entrega como
   `/whatsapp/connect/#invite=<token>`. El fragmento no se envía por HTTP y se
   elimina mediante `history.replaceState` antes de la primera llamada.
2. La invitación se canjea por un session token de 30 minutos. Ambos valores se
   conservan únicamente en memoria.
3. El listener acepta mensajes solo desde `https://www.facebook.com` y
   `https://web.facebook.com`, valida el evento de Coexistence y copia solo
   `business_id`, `waba_id` y `phone_number_id`.
4. El authorization code se conserva en memoria hasta que Session Info quede
   registrado. Después se envía una sola vez a `/onboarding/complete` y se
   elimina.
5. Cancelación, timeout, error o desmontaje abortan solicitudes pendientes y
   borran datos transitorios. Una sesión vencida exige una invitación nueva.
6. Las peticiones usan JSON por `POST`, `credentials: omit`, `cache: no-store`
   y `referrerPolicy: no-referrer`. No hay cookies, logs del body ni
   almacenamiento permanente del navegador.

La misma sesión firmada vincula Session Info y código con el tenant autorizado;
el navegador nunca proporciona un `tenantId`.

## CSP y CORS

- `vercel.json` agrega `https://whatsapp-api.maiatesta.com` únicamente al
  `connect-src` de `/whatsapp/connect`.
- El callback conserva una política sin acceso al backend ni al SDK de Meta.
- El backend aplica CORS únicamente bajo `/onboarding`.
- `ALLOWED_ORIGINS` acepta orígenes exactos HTTPS, permite HTTP solo para
  localhost y rechaza `*`.

## Configuración pendiente en Vercel (requiere aprobación)

Crear como variable pública de build para Preview y Production:

```text
VITE_WHATSAPP_BACKEND_URL=https://whatsapp-api.maiatesta.com
```

No añadir a Vercel secretos de Meta, tokens de webhook, claves de cifrado,
credenciales de PostgreSQL/Redis ni `ADMIN_API_KEY`. Si se usa un dominio de
Preview, añadir temporalmente su origen exacto a `ALLOWED_ORIGINS`; nunca usar
`*.vercel.app` ni `*`.

## Resultados locales

- lógica frontend: **46/46**;
- navegador Playwright: **15/15**;
- rutas de onboarding con PostgreSQL, Redis y Meta simulado: **11/11**;
- seguridad CORS: **3/3**;
- build frontend SSR/SSG: **PASS**;
- typecheck backend: **PASS**;
- revisión visual desktop y móvil: **PASS**, sin overflow; capturas en
  `.visual-checks/whatsapp-connect-desktop.png` y
  `.visual-checks/whatsapp-connect-mobile.png`.

Las pruebas de integración reproducen Session Info→code, code→Session Info,
cancelación después de recibir un código, sesión vencida y asociación final al
tenant originado en la invitación. Meta Graph API está completamente simulada.
