import { describe, expect, it } from 'vitest';
import { serializeRequestForLog } from '../../src/logging/requestSerializer.js';

/**
 * Construye el objeto en la forma REAL que este serializer recibe —
 * la salida del serializer POR DEFECTO de pino-std-serializers
 * (`{ id, method, url, query, params, headers, remoteAddress, remotePort, raw }`),
 * nunca la petición HTTP cruda (`IncomingMessage`). Confirmado leyendo
 * `pino-std-serializers` (`wrapRequestSerializer` siempre antepone el
 * serializer por defecto) y con un script de reproducción real — ver
 * `src/logging/requestSerializer.ts` para la explicación completa.
 *
 * La primera versión de esta prueba construía un objeto con `socket`
 * directamente, una forma que este serializer NUNCA recibe en producción
 * — daba una falsa sensación de cobertura porque pasaba sin que el código
 * probado reflejara el comportamiento real de Pino. Esta versión usa
 * exactamente la forma real, con `remoteAddress`/`remotePort` en el nivel
 * superior y `raw.ip` para la IP de cliente resuelta por Express.
 */
function fakeWrappedReq(
  overrides: Partial<{
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    remoteAddress: string;
    remotePort: number;
    clientIp: string;
  }> = {},
) {
  return {
    id: overrides.id ?? 'req-1',
    method: overrides.method ?? 'GET',
    url: overrides.url,
    headers: overrides.headers ?? {},
    remoteAddress: overrides.remoteAddress ?? '10.10.10.10', // peer TCP directo — Nginx en producción
    remotePort: overrides.remotePort ?? 12345,
    raw: { ip: overrides.clientIp ?? '203.0.113.9' }, // ya resuelto por Express (trust proxy), nunca leído aquí de X-Forwarded-For directamente
  } as never;
}

describe('serializeRequestForLog — allow-list, nunca la query string', () => {
  it('recorta la query string de url, incluso con múltiples "?" o caracteres codificados', () => {
    const result = serializeRequestForLog(fakeWrappedReq({ url: '/webhooks/meta/whatsapp?hub.verify_token=SECRETO&x=1' }));
    expect(result.url).toBe('/webhooks/meta/whatsapp');
  });

  it('nunca produce un campo "query"', () => {
    const result = serializeRequestForLog(fakeWrappedReq({ url: '/a?b=c' }));
    expect('query' in result).toBe(false);
  });

  it('una URL sin query string queda intacta', () => {
    const result = serializeRequestForLog(fakeWrappedReq({ url: '/health' }));
    expect(result.url).toBe('/health');
  });

  it('copia únicamente las cabeceras permitidas — Authorization/Cookie/X-Hub-Signature-256 nunca aparecen', () => {
    const result = serializeRequestForLog(
      fakeWrappedReq({
        headers: {
          host: 'example.com',
          'user-agent': 'test-agent',
          authorization: 'Bearer SECRETO',
          cookie: 'session=SECRETO',
          'x-hub-signature-256': 'sha256=SECRETO',
          'x-custom-unlisted-header': 'deberia-quedar-fuera',
        },
      }),
    );
    expect(result.headers).toEqual({ host: 'example.com', 'user-agent': 'test-agent' });
    expect(JSON.stringify(result)).not.toContain('SECRETO');
    expect(JSON.stringify(result)).not.toContain('deberia-quedar-fuera');
  });

  it('conserva método, id y remotePort para diagnóstico operativo', () => {
    const result = serializeRequestForLog(fakeWrappedReq({ id: 'req-42', method: 'POST', url: '/x', remotePort: 55555 }));
    expect(result).toMatchObject({ id: 'req-42', method: 'POST', remotePort: 55555 });
  });

  it('proxyRemoteAddress viene del peer TCP directo (remoteAddress del objeto envuelto), nunca de raw.ip', () => {
    const result = serializeRequestForLog(fakeWrappedReq({ remoteAddress: '172.18.0.5', clientIp: '203.0.113.9' }));
    expect(result.proxyRemoteAddress).toBe('172.18.0.5');
    expect(result.proxyRemoteAddress).not.toBe('203.0.113.9');
  });

  it('clientIp viene de raw.ip (ya resuelto por Express vía trust proxy), nunca del peer TCP directo', () => {
    const result = serializeRequestForLog(fakeWrappedReq({ remoteAddress: '172.18.0.5', clientIp: '203.0.113.9' }));
    expect(result.clientIp).toBe('203.0.113.9');
  });

  it('si raw no está presente, clientIp es undefined sin lanzar', () => {
    const req = { id: '1', method: 'GET', url: '/x', headers: {}, remoteAddress: '1.2.3.4', remotePort: 1 } as never;
    expect(() => serializeRequestForLog(req)).not.toThrow();
    expect(serializeRequestForLog(req).clientIp).toBeUndefined();
  });

  it('nunca adjunta el objeto de petición crudo completo, solo lee raw.ip', () => {
    const result = serializeRequestForLog(fakeWrappedReq({ url: '/x' }));
    expect('raw' in result).toBe(false);
  });
});
