import type { EmbeddedSignupSessionInfo } from './metaEmbeddedSignup';

export type OnboardingSession = {
  sessionToken: string;
  expiresAt: string;
};

export type OnboardingResult = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
};

export class OnboardingApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super('The onboarding request could not be completed.');
    this.name = 'OnboardingApiError';
    this.status = status;
    this.code = code;
  }
}

type FetchImplementation = typeof fetch;

export type WhatsappOnboardingApi = {
  start: (invitationToken: string, signal?: AbortSignal) => Promise<OnboardingSession>;
  recordSessionInfo: (
    sessionToken: string,
    sessionInfo: EmbeddedSignupSessionInfo,
    signal?: AbortSignal,
  ) => Promise<void>;
  complete: (
    sessionToken: string,
    authorizationCode: string,
    signal?: AbortSignal,
  ) => Promise<OnboardingResult>;
};

function normalizeBackendUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('VITE_WHATSAPP_BACKEND_URL is invalid.');
  }

  const isLocalHttp =
    url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('VITE_WHATSAPP_BACKEND_URL must use HTTPS.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_WHATSAPP_BACKEND_URL must not contain credentials, query parameters, or fragments.');
  }

  return url.href.replace(/\/$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readError(response: Response): Promise<OnboardingApiError> {
  const body: unknown = await response.json().catch(() => null);
  const candidate = isRecord(body) ? body.error : undefined;
  const code =
    typeof candidate === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(candidate)
      ? candidate
      : 'REQUEST_FAILED';
  return new OnboardingApiError(response.status, code);
}

export function createWhatsappOnboardingApi(params: {
  baseUrl: string;
  fetchImpl?: FetchImplementation;
}): WhatsappOnboardingApi {
  const baseUrl = normalizeBackendUrl(params.baseUrl);
  const fetchImpl = params.fetchImpl ?? fetch;

  async function request(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal,
    });
    if (!response.ok) throw await readError(response);
    return response;
  }

  return {
    async start(invitationToken, signal) {
      if (!invitationToken) throw new OnboardingApiError(400, 'INVITATION_REQUIRED');
      const response = await request('/onboarding/start', { invitationToken }, signal);
      const body: unknown = await response.json().catch(() => null);
      if (
        !isRecord(body) ||
        typeof body.sessionToken !== 'string' ||
        body.sessionToken.length === 0 ||
        typeof body.expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(body.expiresAt))
      ) {
        throw new OnboardingApiError(502, 'INVALID_BACKEND_RESPONSE');
      }
      return { sessionToken: body.sessionToken, expiresAt: body.expiresAt };
    },

    async recordSessionInfo(sessionToken, sessionInfo, signal) {
      await request('/onboarding/session', { sessionToken, sessionInfo }, signal);
    },

    async complete(sessionToken, authorizationCode, signal) {
      const response = await request(
        '/onboarding/complete',
        { sessionToken, authorizationCode },
        signal,
      );
      const body: unknown = await response.json().catch(() => null);
      if (
        !isRecord(body) ||
        typeof body.wabaId !== 'string' ||
        typeof body.phoneNumberId !== 'string' ||
        typeof body.displayPhoneNumber !== 'string'
      ) {
        throw new OnboardingApiError(502, 'INVALID_BACKEND_RESPONSE');
      }
      return {
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        displayPhoneNumber: body.displayPhoneNumber,
      };
    },
  };
}

export function readInvitationTokenFromHash(hash: string): string | null {
  if (!hash.startsWith('#')) return null;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('invite');
  if (!token || token.length > 8192) return null;
  return token;
}

export function isExpiredOnboardingError(error: unknown): boolean {
  return (
    error instanceof OnboardingApiError &&
    ['INVALID_SESSION_TOKEN', 'SESSION_NOT_FOUND', 'SESSION_EXPIRED'].includes(error.code)
  );
}

export type CoordinatorOutcome = { status: 'waiting' } | { status: 'connected'; result: OnboardingResult };

/**
 * Holds all transient credentials in closure memory. It serializes the two
 * independent Meta channels, records Session Info before exchanging the code,
 * and never exposes the code/session token in state, callbacks, errors or logs.
 */
export class EmbeddedSignupCoordinator {
  private sessionToken?: string;
  private expiresAtMs = 0;
  private authorizationCode?: string;
  private sessionInfo?: EmbeddedSignupSessionInfo;
  private sessionInfoRecorded = false;
  private completedResult?: OnboardingResult;
  private operation: Promise<CoordinatorOutcome> = Promise.resolve({ status: 'waiting' });
  private abortController = new AbortController();
  private generation = 0;

  constructor(private readonly api: WhatsappOnboardingApi) {}

  beginSession(session: OnboardingSession): void {
    this.clearAll();
    this.sessionToken = session.sessionToken;
    this.expiresAtMs = Date.parse(session.expiresAt);
  }

  acceptAuthorizationCode(code: string): Promise<CoordinatorOutcome> {
    if (!code) return Promise.reject(new OnboardingApiError(400, 'INCOMPLETE_AUTHORIZATION'));
    this.authorizationCode = code;
    return this.enqueue();
  }

  acceptSessionInfo(sessionInfo: EmbeddedSignupSessionInfo): Promise<CoordinatorOutcome> {
    this.sessionInfo = sessionInfo;
    return this.enqueue();
  }

  cancelAttempt(): void {
    this.generation += 1;
    this.abortController.abort();
    this.abortController = new AbortController();
    this.authorizationCode = undefined;
    this.sessionInfo = undefined;
    this.sessionInfoRecorded = false;
    this.completedResult = undefined;
    this.operation = Promise.resolve({ status: 'waiting' });
  }

  dispose(): void {
    this.clearAll();
  }

  private clearAll(): void {
    this.cancelAttempt();
    this.sessionToken = undefined;
    this.expiresAtMs = 0;
  }

  private enqueue(): Promise<CoordinatorOutcome> {
    const generation = this.generation;
    const next = this.operation
      .catch((): CoordinatorOutcome => ({ status: 'waiting' }))
      .then(() => this.flush(generation));
    this.operation = next;
    return next;
  }

  private async flush(generation: number): Promise<CoordinatorOutcome> {
    if (this.completedResult) {
      return { status: 'connected', result: this.completedResult };
    }
    const sessionToken = this.sessionToken;
    if (!sessionToken || this.expiresAtMs <= Date.now()) {
      this.authorizationCode = undefined;
      this.sessionInfo = undefined;
      throw new OnboardingApiError(410, 'SESSION_EXPIRED');
    }
    if (generation !== this.generation) return { status: 'waiting' };

    if (!this.sessionInfoRecorded && this.sessionInfo) {
      const sessionInfo = this.sessionInfo;
      await this.api.recordSessionInfo(sessionToken, sessionInfo, this.abortController.signal);
      if (generation !== this.generation) return { status: 'waiting' };
      this.sessionInfo = undefined;
      this.sessionInfoRecorded = true;
    }

    if (!this.sessionInfoRecorded || !this.authorizationCode) {
      return { status: 'waiting' };
    }

    const authorizationCode = this.authorizationCode;
    this.authorizationCode = undefined;
    const result = await this.api.complete(sessionToken, authorizationCode, this.abortController.signal);
    if (generation !== this.generation) return { status: 'waiting' };

    this.sessionToken = undefined;
    this.expiresAtMs = 0;
    this.sessionInfoRecorded = false;
    this.completedResult = result;
    return { status: 'connected', result };
  }
}
