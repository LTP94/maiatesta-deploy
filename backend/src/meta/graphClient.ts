/**
 * Cliente de Meta Graph API — expone ÚNICAMENTE las tres operaciones que
 * Coexistence necesita: intercambio de código, lectura de números bajo una
 * WABA, y suscripción de la app a los webhooks de esa WABA.
 *
 * Por construcción, no por convención: esta clase NO tiene ningún método
 * que llame a `/register` ni a `/deregister` de Graph API. No es una regla
 * documentada que alguien pueda olvidar — es una operación que este cliente
 * simplemente no sabe hacer. Ver docs/META_V4_COMPATIBILITY.md §5 para la
 * cita textual de la documentación oficial de Meta sobre por qué ambas
 * deben evitarse para un número Coexistence (`/register` puede convertirlo
 * a un número exclusivo de Cloud API; `/deregister` sencillamente no
 * funciona si el número está en uso dual y la documentación lo advierte
 * explícitamente).
 *
 * `fetchImpl` es inyectable — nunca usa `fetch` global directamente dentro
 * de los métodos — para que las pruebas puedan sustituir una implementación
 * que simula a Graph API sin red real (petición explícita: "Utiliza Meta
 * Graph API simulada para las pruebas automatizadas").
 */

export class MetaGraphApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'MetaGraphApiError';
    this.status = status;
    this.code = code;
  }
}

export type ExchangeCodeResult = {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
};

export type WabaPhoneNumber = {
  id: string;
  displayPhoneNumber: string;
  isOnBizApp: boolean;
  platformType: string;
};

type FetchImpl = typeof fetch;

// Meta IDs son numéricos (a veces con prefijos internos, pero siempre sin
// '/', '?', espacios). Esto es la defensa contra construir accidentalmente
// una URL con un segmento de path inyectado — nunca se interpola un id sin
// pasar por esto primero.
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function assertSafeId(id: string, label: string): void {
  if (!id || !SAFE_ID_PATTERN.test(id)) {
    throw new MetaGraphApiError(`Invalid ${label} — refusing to build a request URL from it.`, 400);
  }
}

export class MetaGraphClient {
  private readonly graphApiVersion: string;
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly fetchImpl: FetchImpl;
  private readonly baseUrl: string;

  constructor(params: {
    graphApiVersion: string;
    appId: string;
    appSecret: string;
    fetchImpl?: FetchImpl;
    baseUrl?: string; // solo para pruebas — nunca configurado en producción a otra cosa que graph.facebook.com
  }) {
    this.graphApiVersion = params.graphApiVersion;
    this.appId = params.appId;
    this.appSecret = params.appSecret;
    this.fetchImpl = params.fetchImpl ?? fetch;
    this.baseUrl = params.baseUrl ?? `https://graph.facebook.com/${this.graphApiVersion}`;
  }

  get applicationId(): string {
    return this.appId;
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        body && typeof body === 'object' && 'error' in body && typeof (body as { error?: { message?: string } }).error?.message === 'string'
          ? (body as { error: { message: string } }).error.message
          : `Graph API request failed with status ${response.status}.`;
      const code =
        body && typeof body === 'object' && 'error' in body && typeof (body as { error?: { code?: string } }).error?.code === 'string'
          ? (body as { error: { code: string } }).error.code
          : undefined;
      throw new MetaGraphApiError(message, response.status, code);
    }

    return body;
  }

  /**
   * Intercambia el authorization code de FB.login por un access token —
   * nunca guarda ni loguea el `code` en sí, solo lo reenvía a Meta en esta
   * única llamada.
   */
  async exchangeCodeForAccessToken(code: string): Promise<ExchangeCodeResult> {
    if (!code) {
      throw new MetaGraphApiError('Missing authorization code.', 400);
    }

    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      code,
    });

    const body = (await this.request(`/oauth/access_token?${params.toString()}`, { method: 'GET' })) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
    };

    if (!body?.access_token) {
      throw new MetaGraphApiError('Graph API did not return an access_token.', 502);
    }

    return {
      accessToken: body.access_token,
      tokenType: body.token_type ?? 'bearer',
      expiresIn: body.expires_in,
    };
  }

  /**
   * Lista los números bajo una WABA, con los campos del modelo de cuentas
   * v4 (docs/META_V4_COMPATIBILITY.md §4) necesarios para verificar que la
   * conexión sigue siendo Coexistence.
   */
  async getWabaPhoneNumbers(wabaId: string, accessToken: string): Promise<WabaPhoneNumber[]> {
    assertSafeId(wabaId, 'wabaId');
    if (!accessToken) {
      throw new MetaGraphApiError('Missing access token.', 400);
    }

    const params = new URLSearchParams({
      fields: 'id,display_phone_number,is_on_biz_app,platform_type',
      access_token: accessToken,
    });

    const body = (await this.request(`/${wabaId}/phone_numbers?${params.toString()}`, { method: 'GET' })) as {
      data?: Array<{ id?: string; display_phone_number?: string; is_on_biz_app?: boolean; platform_type?: string }>;
    };

    return (body?.data ?? []).map((entry) => {
      if (!entry.id || !entry.display_phone_number) {
        throw new MetaGraphApiError('Graph API returned a phone number entry missing required fields.', 502);
      }
      return {
        id: entry.id,
        displayPhoneNumber: entry.display_phone_number,
        isOnBizApp: entry.is_on_biz_app ?? false,
        platformType: entry.platform_type ?? 'UNKNOWN',
      };
    });
  }

  /**
   * Resuelve el id de usuario de Meta app-scoped que autorizó la conexión
   * — necesario para `MetaAuthorization.metaUserId`, el mismo campo que
   * `signed_request.user_id` en los callbacks de deauthorize/data-deletion
   * ya implementados. **Esta operación específica no se ha verificado
   * contra la API real de Meta en esta etapa** — ver el informe de la
   * Etapa 2 para la lista completa de qué falta confirmar empíricamente.
   */
  async getAuthorizingUserId(accessToken: string): Promise<string> {
    if (!accessToken) {
      throw new MetaGraphApiError('Missing access token.', 400);
    }

    const params = new URLSearchParams({ fields: 'id', access_token: accessToken });
    const body = (await this.request(`/me?${params.toString()}`, { method: 'GET' })) as { id?: string };

    if (!body?.id) {
      throw new MetaGraphApiError('Graph API did not return a user id from /me.', 502);
    }

    return body.id;
  }

  /** Suscribe esta app a los eventos de webhook de la WABA. */
  async subscribeAppToWaba(wabaId: string, accessToken: string): Promise<void> {
    assertSafeId(wabaId, 'wabaId');
    if (!accessToken) {
      throw new MetaGraphApiError('Missing access token.', 400);
    }

    const params = new URLSearchParams({ access_token: accessToken });
    const body = (await this.request(`/${wabaId}/subscribed_apps?${params.toString()}`, { method: 'POST' })) as { success?: boolean };
    if (body?.success !== true) throw new MetaGraphApiError('Graph API did not confirm the WABA subscription.', 502);
  }

  /** Lista apps ya suscritas para que la operación POST sea idempotente. */
  async getSubscribedApps(wabaId: string, accessToken: string): Promise<string[]> {
    assertSafeId(wabaId, 'wabaId');
    if (!accessToken) throw new MetaGraphApiError('Missing access token.', 400);
    const params = new URLSearchParams({ access_token: accessToken });
    const body = (await this.request(`/${wabaId}/subscribed_apps?${params.toString()}`, { method: 'GET' })) as {
      data?: Array<{ id?: string }>;
    };
    return (body.data ?? []).flatMap((entry) => (entry.id ? [entry.id] : []));
  }
}

/**
 * Guardia en tiempo de ejecución, verificada también por una prueba
 * dedicada (tests/unit/graphClient.test.ts): ningún método del prototipo
 * de MetaGraphClient contiene "register" en su nombre. No reemplaza la
 * revisión de código — la complementa, para que agregar el método
 * equivocado en el futuro falle una prueba explícita, no solo dependa de
 * que alguien lea este comentario.
 */
export function listGraphClientMethodNames(): string[] {
  return Object.getOwnPropertyNames(MetaGraphClient.prototype).filter((name) => name !== 'constructor');
}
