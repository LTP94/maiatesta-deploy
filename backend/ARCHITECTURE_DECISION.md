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

## Riesgo abierto explícito

Esta decisión asume que Hostinger puede alojar un cuarto servicio Node.js persistente (además de Evolution/Chatwoot/Typebot/n8n) con recursos suficientes (RAM/CPU) y que existe (o se puede crear) una forma de exponerlo públicamente con HTTPS. **Ninguna de las dos cosas está confirmada** — es exactamente lo primero que `HOSTINGER_INTEGRATION_GUIDE.md` pedirá diagnosticar, de solo lectura, antes de cualquier instalación real.
