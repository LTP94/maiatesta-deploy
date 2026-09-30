import type { IncomingMessage } from 'node:http';

/**
 * Serializador de peticiones HTTP para Pino — auditoría de registros
 * (2026-09-29, hallazgo V1) y revisión posterior sobre `remoteAddress`/
 * `remotePort`/IP de cliente (misma fecha). Lista EXPLÍCITA de campos
 * permitidos (allow-list), no una lista de exclusión (`redact`): un
 * `redact` solo puede reemplazar el valor COMPLETO de una clave conocida
 * de antemano — no puede recortar un secreto que vive DENTRO de un string
 * (`req.url`), y no protege contra una cabecera o propiedad nueva que
 * nadie anticipó. Un allow-list es estructuralmente más seguro: cualquier
 * dato no listado aquí explícitamente jamás llega al log.
 *
 * ---------------------------------------------------------------------
 * CÓMO ENTREGA REALMENTE `pino-http` LA PETICIÓN A UN SERIALIZER
 * PERSONALIZADO (verificado leyendo `pino-http`/`pino-std-serializers`, no
 * asumido, y confirmado con un script de reproducción aislado):
 *
 * `pino-http` SIEMPRE envuelve cualquier `serializers.req` personalizado
 * (`wrapRequestSerializer`, en `pino-std-serializers/index.js`):
 *
 *   return function wrappedReqSerializer (req) {
 *     return customSerializer(reqSerializers.reqSerializer(req))
 *   }
 *
 * Es decir: este serializer NUNCA recibe la petición HTTP cruda
 * (`IncomingMessage`) — recibe el objeto YA PRODUCIDO por el serializer
 * POR DEFECTO de pino-std-serializers, con esta forma:
 *
 *   { id, method, url, query, params, headers, remoteAddress, remotePort, raw }
 *
 * Donde `remoteAddress`/`remotePort` ya vienen extraídos por ese
 * serializer por defecto de `(req.info || req.socket)` — el objeto que
 * llega aquí NUNCA tiene una propiedad `.socket` propia. La versión
 * anterior de este archivo leía `req.socket?.remoteAddress`, que por eso
 * SIEMPRE evaluaba a `undefined`, en silencio, sin ningún error de tipos
 * ni en runtime — confirmado en revisión posterior, reproducido con un
 * script aislado antes de tocar este archivo.
 *
 * `raw` sí existe, y apunta a la petición Express/Node ORIGINAL completa
 * (con `.ip`/`.ips`, ya resueltos por Express según `trust proxy`) — es la
 * única vía para llegar a la IP real del cliente cuando el backend corre
 * detrás de un proxy inverso.
 * ---------------------------------------------------------------------
 *
 * DISTINCIÓN EXPLÍCITA proxy vs. cliente (el backend corre exclusivamente
 * detrás de Nginx Proxy Manager, nunca expuesto directamente — ver
 * ARCHITECTURE_DECISION.md): `proxyRemoteAddress` es el peer TCP directo
 * (en producción, SIEMPRE Nginx, nunca el cliente real). `clientIp` es
 * `req.raw.ip` — el valor que Express ya resuelve a partir de
 * `X-Forwarded-For`, respetando `trust proxy` (configurado a `1` en
 * `createApp()`, exactamente el número de saltos reales: Nginx). Este
 * serializer NUNCA lee `X-Forwarded-For` por su cuenta — delegar en
 * `req.ip` es lo que evita confiar indiscriminadamente en una cabecera que
 * el cliente controla: Express solo la honra hasta el número de saltos
 * configurado, nunca más allá.
 */

const ALLOWED_HEADER_NAMES = ['host', 'user-agent', 'content-type', 'content-length', 'accept', 'accept-encoding'] as const;

type AllowedHeaderName = (typeof ALLOWED_HEADER_NAMES)[number];

export type SerializedRequest = {
  id: string | number | undefined;
  method: string | undefined;
  url: string | undefined; // ruta únicamente — la query string se descarta siempre, ver pathOnly()
  headers: Partial<Record<AllowedHeaderName, string>>;
  proxyRemoteAddress: string | undefined; // peer TCP directo — Nginx Proxy Manager en producción, NUNCA el cliente real
  clientIp: string | undefined; // req.ip de Express (trust proxy = 1) — resuelto de X-Forwarded-For, nunca leído a mano
  remotePort: number | undefined;
};

/** Petición original de Express/Node — solo lo que necesitamos leer de `raw`. */
type OriginalRequest = IncomingMessage & { ip?: string };

/**
 * Forma real que este serializer recibe: la SALIDA del serializer por
 * defecto de `pino-std-serializers` (ver explicación arriba), no la
 * petición HTTP cruda. `headers` aquí es el objeto completo sin filtrar
 * (`_req.headers = req.headers`, copiado tal cual por el serializer por
 * defecto) — este archivo sigue siendo el único punto que decide qué
 * subconjunto de esas cabeceras llega al log.
 */
type WrappedRequest = {
  id?: string | number;
  method?: string;
  url?: string; // ya incluye la query string en este punto — se recorta abajo, igual que antes
  headers?: Record<string, string | string[] | undefined>;
  remoteAddress?: string;
  remotePort?: number;
  raw?: OriginalRequest;
};

/** Descarta todo desde el primer '?' — nunca se asume que el resto del string es seguro de inspeccionar campo por campo. */
function pathOnly(url: string | undefined): string | undefined {
  if (!url) return url;
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

export function serializeRequestForLog(req: WrappedRequest): SerializedRequest {
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
    url: pathOnly(req.url),
    headers,
    proxyRemoteAddress: req.remoteAddress,
    clientIp: req.raw?.ip,
    remotePort: req.remotePort,
  };
}
