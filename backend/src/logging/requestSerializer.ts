import type { IncomingMessage } from 'node:http';

/**
 * Serializador de peticiones HTTP para Pino — auditoría de registros
 * (2026-09-29). Lista EXPLÍCITA de campos permitidos (allow-list), no una
 * lista de exclusión (`redact`): un `redact` solo puede reemplazar el valor
 * COMPLETO de una clave conocida de antemano — no puede recortar un secreto
 * que vive DENTRO de un string (`req.url`), y no protege contra una cabecera
 * o propiedad nueva que nadie anticipó. Un allow-list es estructuralmente
 * más seguro: cualquier dato no listado aquí explícitamente jamás llega al
 * log, sin importar qué campo nuevo agregue Express, un cliente HTTP, o una
 * versión futura de `pino-http`.
 *
 * Confirmado por auditoría (ver hallazgo V1): el serializer *por defecto* de
 * `pino-http` (vía `pino-std-serializers`) copia `req.originalUrl` (URL
 * completa, con query string) Y `req.query` (objeto ya parseado) sin que la
 * configuración `redact` anterior cubriera ninguno de los dos —
 * reproducido en vivo con un token ficticio, apareciendo en ambos campos.
 *
 * Esta implementación:
 *  - Nunca incluye la query string, en ningún campo, bajo ninguna
 *    circunstancia — ni en `url` (se recorta en el primer '?') ni como
 *    campo `query` aparte (simplemente no existe en el objeto devuelto).
 *  - Solo copia las cabeceras explícitamente listadas en
 *    `ALLOWED_HEADER_NAMES` — todas operativas (host, user-agent,
 *    content-type, content-length, accept, accept-encoding), ninguna de
 *    autenticación o identidad. `Authorization`, `Cookie` y
 *    `X-Hub-Signature-256` NUNCA se copian — no hace falta redactarlas
 *    porque nunca llegan a existir en el objeto serializado.
 *  - Nunca adjunta el objeto de petición crudo (`req.raw`/`req` completo) —
 *    a diferencia del serializer por defecto, que sí lo hace (aunque como
 *    propiedad no enumerable, invisible a `JSON.stringify` hoy; este
 *    serializer no depende de ese detalle de implementación para estar a
 *    salvo).
 *
 * No sustituye por completo el uso de `redact` en `pinoHttp` — se mantiene
 * una lista de redact mínima en `src/app.ts` como red de seguridad
 * adicional (defensa en profundidad), documentada allí como normalmente
 * inerte dado este allow-list.
 */

const ALLOWED_HEADER_NAMES = ['host', 'user-agent', 'content-type', 'content-length', 'accept', 'accept-encoding'] as const;

type AllowedHeaderName = (typeof ALLOWED_HEADER_NAMES)[number];

export type SerializedRequest = {
  id: string | number | undefined;
  method: string | undefined;
  url: string | undefined; // ruta únicamente — la query string se descarta siempre, ver pathOnly()
  headers: Partial<Record<AllowedHeaderName, string>>;
  remoteAddress: string | undefined;
  remotePort: number | undefined;
};

/** Request tal como lo ve pino-http: IncomingMessage + las extensiones que Express/pino-http le agregan. */
type LoggableRequest = IncomingMessage & {
  id?: string | number;
  originalUrl?: string;
};

/** Descarta todo desde el primer '?' — nunca se asume que el resto del string es seguro de inspeccionar campo por campo. */
function pathOnly(url: string | undefined): string | undefined {
  if (!url) return url;
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

export function serializeRequestForLog(req: LoggableRequest): SerializedRequest {
  const headers: SerializedRequest['headers'] = {};
  for (const name of ALLOWED_HEADER_NAMES) {
    const value = req.headers?.[name];
    if (typeof value === 'string') {
      headers[name] = value;
    }
  }

  return {
    id: req.id,
    method: req.method,
    url: pathOnly(req.originalUrl ?? req.url),
    headers,
    remoteAddress: req.socket?.remoteAddress,
    remotePort: req.socket?.remotePort,
  };
}
