# Compatibilidad con Meta Embedded Signup v4 (Coexistence)

Verificación previa a la Etapa 2, contra la documentación oficial vigente de Meta for Developers, consultada directamente (no memoria del modelo) el 2026-09-29. Fuentes: `developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users/`, `.../embedded-signup/version-4`, `developers.facebook.com/docs/whatsapp/embedded-signup/get-started/`.

## 1. `featureType: 'whatsapp_business_app_onboarding'` — confirmado necesario en v4

La página oficial de v4 declara textualmente: **"Onboarding WhatsApp Business app users continues to be supported through the `feature_type` parameter"**. No es un mecanismo heredado de v2/v3 que v4 haya reemplazado — sigue siendo el mecanismo actual. **No se requiere ningún cambio** en `src/hooks/useWhatsappEmbeddedSignup.ts` del repo Vercel (fuera del alcance de este backend, pero verificado por consistencia) en este punto.

## 2. `sessionInfoVersion` — sigue sin confirmarse, se mantiene defensivo

Ni la página de Coexistence ni la de v4 mencionan `sessionInfoVersion` explícitamente como requerido o eliminado. Esto coincide con lo que ya documentaba `docs/meta-whatsapp-embedded-signup.md` del repo Vercel antes de esta revisión — la postura correcta sigue siendo la misma: mantenerlo por defensividad (un parámetro extra e innecesario pesa menos que omitir uno que Meta todavía requiera), sin poder confirmarlo con certeza absoluta a partir de documentación estática. Esto solo lo confirma empíricamente la Fase C (prueba manual contra el popup real), que sigue pendiente y sigue siendo responsabilidad del propietario, no de este backend.

## 3. Evento de finalización de sesión — confirmado verbatim, coincide exactamente con el código existente

La documentación oficial de Coexistence da el payload exacto:

```json
{
  "data": { "waba_id": "<CUSTOMER_WABA_ID>" },
  "type": "WA_EMBEDDED_SIGNUP",
  "event": "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
  "version": 3
}
```

Esto es carácter por carácter lo que `src/utils/metaEmbeddedSignup.ts` del repo Vercel ya espera (`COEXISTENCE_FINISH_EVENT = 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'`) — **sin cambios necesarios**.

## 4. Cambio real en el modelo de cuentas — dos campos nuevos que SÍ afectan el esquema

La documentación de onboarding de Coexistence menciona explícitamente, en el contexto de los datos que devuelve la cuenta/número tras una conexión exitosa:

- **`is_on_biz_app`** (boolean) — indica que el número sigue en uso dual (WhatsApp Business app + Cloud API). Este es precisamente el hecho que Coexistence existe para preservar — sin este campo, `onboarding/complete` no tiene forma de verificar programáticamente, contra la respuesta real de Graph API, que la conexión resultante sigue siendo Coexistence y no una migración completa.
- **`platform_type`** (string, valor observado: `"CLOUD_API"`) — indica la plataforma bajo la que Meta procesa la mensajería del número.

**Ninguno de los dos existía en el esquema de la Etapa 1.** Se añaden a `PhoneNumber` en la migración `20260929190000_add_meta_v4_account_fields` — ver `prisma/schema.prisma`. `onboarding/complete` (Etapa 2, este mismo commit) los persiste desde la respuesta de Graph API y los usa como parte de la validación: si `is_on_biz_app` no es `true` tras una conexión que se pidió como Coexistence, se trata como una discrepancia a reportar, no se asume éxito silenciosamente.

## 5. Confirmación explícita: NUNCA llamar `/register`, y un hallazgo nuevo — tampoco `/deregister`

La documentación oficial dice textualmente: **"skip the phone number registration step, as the number is already registered"** — confirma exactamente la regla que ya existía en `docs/meta-whatsapp-embedded-signup.md` del repo Vercel.

**Hallazgo nuevo, no documentado antes en este proyecto:** la misma página advierte **"You cannot use the Deregister API to deregister a business phone number from Cloud API if it is already in use with both Cloud API and the WhatsApp Business app."** — es decir, un número Coexistence tampoco debe des-registrarse vía la API de Deregister. Este backend no tenía ninguna mención de esta operación específica; se añade como segunda regla explícita junto a la de `/register` (ver `src/meta/graphClient.ts`, Etapa 2 — el cliente de Graph API expone únicamente las operaciones necesarias para Coexistence y no incluye ni `/register` ni `/deregister` como métodos posibles, por construcción, no solo por convención de no llamarlos).

## 6. Fecha de retiro de v2 — confirmada

"Embedded signup v2 will be deprecated on October 15, 2026. Migrate your integration to v4 before that date to avoid disruption." Coincide con la fecha que ya manejaba el repo Vercel. Este backend (Etapa 2) se construye contra v4 desde el inicio — no hereda ningún contrato de v2.

## Lo que la documentación oficial NO expone (limitación real, no evitada)

La forma exacta del objeto `extras` de `FB.login()` para v4 (más allá de que `feature_type` sigue soportado) no aparece en la documentación estática consultada — Meta la expone principalmente a través de su "Embedded Signup Builder" interactivo en el App Dashboard, no en páginas de documentación indexables. Esto ya estaba señalado como limitación en el repo Vercel antes de esta revisión; se mantiene la misma solución: la Fase C (prueba manual contra el popup real de producción) es la única verificación empírica posible de la forma exacta, y sigue pendiente, sin evidencia de haberse completado.

## Resumen de cambios derivados de esta verificación

| Cambio | Dónde | Motivo |
|---|---|---|
| `PhoneNumber.isOnBizApp` (nuevo campo) | `prisma/schema.prisma` + migración | Verificar que la conexión resultante sigue siendo Coexistence, no una migración |
| `PhoneNumber.platformType` (nuevo campo) | `prisma/schema.prisma` + migración | Dato real que Graph API devuelve, antes no persistido |
| Cliente de Graph API sin métodos `/register` ni `/deregister` | `src/meta/graphClient.ts` (Etapa 2) | `/register` ya estaba prohibido; `/deregister` es un hallazgo nuevo de esta verificación |
| Ningún cambio en el frontend de Vercel | — | `featureType` y el evento de finalización ya coinciden exactamente con v4 |
