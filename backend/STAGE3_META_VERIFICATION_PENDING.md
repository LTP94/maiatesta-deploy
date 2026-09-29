# Etapa 3 — verificación real de Meta pendiente

La implementación local usa documentación oficial y simulaciones. Ninguno de los puntos siguientes fue presentado como prueba real:

- callback GET/POST desde infraestructura de Meta hacia Hostinger;
- firma producida por la app real y App Secret real;
- forma empírica de payloads de la WABA/número Coexistence del proyecto;
- GET/POST real de `/{WABA-ID}/subscribed_apps` en Graph `v25.0`;
- entrega real de `smb_message_echoes`, especialmente semántica `from/to` en dispositivos vinculados;
- chunks reales de `history`, rechazo `2593109`, formatos no soportados y volumen;
- `smb_app_state_sync` real para altas/bajas de contactos;
- `account_update` real al desconectar Coexistence;
- ventana de 24 horas, consentimiento y ejecución única de contactos/historial;
- deriva entre ejemplos actuales de documentación y Graph `v25.0` configurado.

## Plan controlado

Usar una app/WABA/número de prueba, nunca un cliente. Confirmar primero configuración de callback y campos compartidos; no modificar callbacks productivos. Ejecutar onboarding Coexistence sin `/register` o `/deregister`, suscribir una vez por WABA, enviar eventos sintéticos/manuales, verificar clasificación y detenerse antes de cualquier adaptador Etapa 4.

La sincronización se inicia solo con consentimiento explícito y dentro de la ventana oficial. No se automatiza un retry de esa operación. Registrar resultados sanitizados en este documento.

**REAL META COEXISTENCE TEST PENDING**

**HOSTINGER VALIDATION PENDING**
