import { describe, expect, it, vi } from 'vitest';
import { MetaGraphApiError, MetaGraphClient, listGraphClientMethodNames } from '../../src/meta/graphClient.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeClient(fetchImpl: typeof fetch) {
  return new MetaGraphClient({
    graphApiVersion: 'v25.0',
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    fetchImpl,
    baseUrl: 'https://graph.example.test/v25.0',
  });
}

describe('MetaGraphClient — construcción segura frente a /register y /deregister', () => {
  it('no expone ningún método cuyo nombre contenga "register" (mayúsc./minúsc.)', () => {
    const names = listGraphClientMethodNames();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name.toLowerCase()).not.toContain('register');
    }
  });

  it('rechaza un wabaId que intente inyectar un segmento de path (p. ej. "123/register")', async () => {
    const fetchSpy = vi.fn();
    const client = makeClient(fetchSpy as unknown as typeof fetch);

    await expect(client.getWabaPhoneNumbers('123/register', 'token')).rejects.toThrow(MetaGraphApiError);
    await expect(client.subscribeAppToWaba('123/register', 'token')).rejects.toThrow(MetaGraphApiError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('MetaGraphClient.exchangeCodeForAccessToken', () => {
  it('devuelve el access_token en una respuesta simulada exitosa', async () => {
    const fetchSpy = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain('/oauth/access_token');
      expect(String(url)).toContain('code=valid-code');
      return jsonResponse({ access_token: 'simulated-token-abc', token_type: 'bearer', expires_in: 5184000 });
    });

    const client = makeClient(fetchSpy as unknown as typeof fetch);
    const result = await client.exchangeCodeForAccessToken('valid-code');

    expect(result.accessToken).toBe('simulated-token-abc');
    expect(result.expiresIn).toBe(5184000);
  });

  it('lanza MetaGraphApiError con el código y mensaje de un error simulado de Meta', async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({ error: { message: 'This authorization code has expired.', code: 'OAuthException' } }, 400),
    );
    const client = makeClient(fetchSpy as unknown as typeof fetch);

    await expect(client.exchangeCodeForAccessToken('expired-code')).rejects.toMatchObject({
      message: 'This authorization code has expired.',
      status: 400,
    });
  });

  it('rechaza un código vacío sin llamar a la red', async () => {
    const fetchSpy = vi.fn();
    const client = makeClient(fetchSpy as unknown as typeof fetch);
    await expect(client.exchangeCodeForAccessToken('')).rejects.toThrow(MetaGraphApiError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('lanza si Graph API responde 200 pero sin access_token (payload inesperado)', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({ unexpected: true }));
    const client = makeClient(fetchSpy as unknown as typeof fetch);
    await expect(client.exchangeCodeForAccessToken('code')).rejects.toThrow(/did not return/i);
  });
});

describe('MetaGraphClient.getWabaPhoneNumbers', () => {
  it('mapea correctamente los campos del modelo de cuentas v4 (is_on_biz_app, platform_type)', async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({
        data: [
          { id: 'phone-1', display_phone_number: '+593999999999', is_on_biz_app: true, platform_type: 'CLOUD_API' },
          { id: 'phone-2', display_phone_number: '+593888888888', is_on_biz_app: false, platform_type: 'CLOUD_API' },
        ],
      }),
    );
    const client = makeClient(fetchSpy as unknown as typeof fetch);
    const numbers = await client.getWabaPhoneNumbers('waba-123', 'token');

    expect(numbers).toEqual([
      { id: 'phone-1', displayPhoneNumber: '+593999999999', isOnBizApp: true, platformType: 'CLOUD_API' },
      { id: 'phone-2', displayPhoneNumber: '+593888888888', isOnBizApp: false, platformType: 'CLOUD_API' },
    ]);
  });

  it('devuelve un array vacío cuando la WABA no tiene números', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({ data: [] }));
    const client = makeClient(fetchSpy as unknown as typeof fetch);
    expect(await client.getWabaPhoneNumbers('waba-empty', 'token')).toEqual([]);
  });

  it('lanza si una entrada de la respuesta simulada no tiene id o display_phone_number', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({ data: [{ is_on_biz_app: true }] }));
    const client = makeClient(fetchSpy as unknown as typeof fetch);
    await expect(client.getWabaPhoneNumbers('waba-123', 'token')).rejects.toThrow(/missing required fields/i);
  });
});

describe('MetaGraphClient.getAuthorizingUserId', () => {
  it('devuelve el id de /me en una respuesta simulada exitosa', async () => {
    const fetchSpy = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain('/me?');
      return jsonResponse({ id: 'meta-user-12345' });
    });
    const client = makeClient(fetchSpy as unknown as typeof fetch);
    expect(await client.getAuthorizingUserId('token')).toBe('meta-user-12345');
  });

  it('lanza si /me no devuelve id', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({}));
    const client = makeClient(fetchSpy as unknown as typeof fetch);
    await expect(client.getAuthorizingUserId('token')).rejects.toThrow(/did not return a user id/i);
  });
});

describe('MetaGraphClient.subscribeAppToWaba', () => {
  it('hace POST a /{wabaId}/subscribed_apps', async () => {
    const fetchSpy = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toContain('/waba-123/subscribed_apps');
      expect(init?.method).toBe('POST');
      return jsonResponse({ success: true });
    });
    const client = makeClient(fetchSpy as unknown as typeof fetch);
    await expect(client.subscribeAppToWaba('waba-123', 'token')).resolves.toBeUndefined();
  });
});
