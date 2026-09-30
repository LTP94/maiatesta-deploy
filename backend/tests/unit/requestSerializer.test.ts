import { describe, expect, it } from 'vitest';
import { serializeRequestForLog } from '../../src/logging/requestSerializer.js';

function fakeReq(overrides: Partial<{ id: string; method: string; originalUrl: string; url: string; headers: Record<string, string>; remoteAddress: string; remotePort: number }> = {}) {
  return {
    id: overrides.id ?? 'req-1',
    method: overrides.method ?? 'GET',
    originalUrl: overrides.originalUrl,
    url: overrides.url,
    headers: overrides.headers ?? {},
    socket: { remoteAddress: overrides.remoteAddress ?? '127.0.0.1', remotePort: overrides.remotePort ?? 12345 },
  } as never;
}

describe('serializeRequestForLog — allow-list, nunca la query string', () => {
  it('recorta la query string de originalUrl, incluso con múltiples "?" o caracteres codificados', () => {
    const result = serializeRequestForLog(fakeReq({ originalUrl: '/webhooks/meta/whatsapp?hub.verify_token=SECRETO&x=1' }));
    expect(result.url).toBe('/webhooks/meta/whatsapp');
  });

  it('nunca produce un campo "query"', () => {
    const result = serializeRequestForLog(fakeReq({ originalUrl: '/a?b=c' }));
    expect('query' in result).toBe(false);
  });

  it('usa url cuando originalUrl no está presente (compat no-Express)', () => {
    const result = serializeRequestForLog(fakeReq({ originalUrl: undefined, url: '/plain?token=SECRETO' }));
    expect(result.url).toBe('/plain');
  });

  it('una URL sin query string queda intacta', () => {
    const result = serializeRequestForLog(fakeReq({ originalUrl: '/health' }));
    expect(result.url).toBe('/health');
  });

  it('copia únicamente las cabeceras permitidas — Authorization/Cookie/X-Hub-Signature-256 nunca aparecen', () => {
    const result = serializeRequestForLog(
      fakeReq({
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

  it('conserva método, id y datos de conexión para diagnóstico operativo', () => {
    const result = serializeRequestForLog(fakeReq({ id: 'req-42', method: 'POST', originalUrl: '/x', remoteAddress: '10.0.0.5', remotePort: 55555 }));
    expect(result).toMatchObject({ id: 'req-42', method: 'POST', remoteAddress: '10.0.0.5', remotePort: 55555 });
  });

  it('nunca adjunta el objeto de petición crudo', () => {
    const result = serializeRequestForLog(fakeReq({ originalUrl: '/x' }));
    expect('raw' in result).toBe(false);
  });
});
