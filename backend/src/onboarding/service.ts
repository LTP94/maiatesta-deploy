import { randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { redeemInvitationToken } from '../access/invitationTokenStore.js';
import { issueSessionToken, verifySessionToken } from '../access/sessionToken.js';
import { scopeToTenant, PhoneAlreadyConnectedError } from '../tenancy/isolation.js';
import { encryptToken } from '../crypto/tokenCipher.js';
import { MetaGraphApiError, type MetaGraphClient } from '../meta/graphClient.js';
import { ensureWabaSubscription } from '../meta/wabaSubscription.js';

/**
 * Orquestación de la Etapa 2 — onboarding/start, /session, /complete.
 * Deliberadamente NO son handlers de Express directamente (ver
 * src/onboarding/routes.ts para eso) — estas funciones toman sus
 * dependencias como parámetros explícitos, así que las pruebas pueden
 * inyectar un Postgres/Redis reales (Docker) y un MetaGraphClient con
 * fetch simulado, sin levantar un servidor HTTP para probar la lógica que
 * realmente importa.
 */

export class OnboardingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'OnboardingError';
    this.code = code;
  }
}

export type OnboardingDeps = {
  prisma: PrismaClient; // rol app_runtime — nunca el rol dueño
  redis: Redis;
  graphClient: MetaGraphClient;
  invitationSecret: string;
  sessionSecret: string;
  encryptionKey: Buffer;
};

const ONBOARDING_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos — una sesión activa, no una invitación

// ---------------------------------------------------------------------------
// onboarding/start
// ---------------------------------------------------------------------------

export type StartOnboardingResult = {
  sessionToken: string;
  expiresAt: Date;
};

/**
 * Consume el token de invitación (de un solo uso, Redis) y crea una nueva
 * OnboardingSession. El tenantId sale ÚNICAMENTE del token verificado — la
 * función no acepta ni necesita un tenantId como parámetro de entrada.
 */
export async function startOnboarding(deps: OnboardingDeps, params: { invitationToken: string }): Promise<StartOnboardingResult> {
  const invitation = await redeemInvitationToken({
    token: params.invitationToken,
    secret: deps.invitationSecret,
    redis: deps.redis,
  });

  const scope = scopeToTenant(deps.prisma, invitation.tenantId);
  const nonce = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + ONBOARDING_SESSION_TTL_MS);

  const session = await scope.onboardingSessions().create({
    adminUserId: invitation.adminUserId,
    nonce,
    expiresAt,
    state: 'AWAITING_AUTHORIZATION',
  });

  const sessionToken = issueSessionToken({ tenantId: invitation.tenantId, nonce: session.nonce, expiresAt: session.expiresAt }, deps.sessionSecret);

  return { sessionToken, expiresAt: session.expiresAt };
}

// ---------------------------------------------------------------------------
// onboarding/session — recibe el Session Info del postMessage de Meta
// ---------------------------------------------------------------------------

export type SessionInfoInput = {
  businessId?: string;
  wabaId?: string;
  phoneNumberId?: string;
};

async function loadSessionOrThrow(deps: OnboardingDeps, sessionToken: string) {
  let verified: ReturnType<typeof verifySessionToken>;
  try {
    verified = verifySessionToken(sessionToken, deps.sessionSecret);
  } catch {
    throw new OnboardingError('INVALID_SESSION_TOKEN', 'Session token is invalid or expired.');
  }

  const scope = scopeToTenant(deps.prisma, verified.tenantId);
  const session = await scope.onboardingSessions().findFirst({ where: { nonce: verified.nonce } });

  if (!session) {
    throw new OnboardingError('SESSION_NOT_FOUND', 'Onboarding session not found.');
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await scope.onboardingSessions().updateByNonce(session.nonce, { state: 'EXPIRED' });
    throw new OnboardingError('SESSION_EXPIRED', 'Onboarding session has expired.');
  }

  return { scope, session, tenantId: verified.tenantId };
}

export async function recordSessionInfo(deps: OnboardingDeps, params: { sessionToken: string; sessionInfo: SessionInfoInput }): Promise<void> {
  const { scope, session } = await loadSessionOrThrow(deps, params.sessionToken);

  if (session.state === 'OPERATIONAL') {
    // Una sesión ya completada no vuelve a aceptar Session Info nuevo —
    // "no permiten reutilizar una autorización anterior" (condición 7 de
    // la Etapa 2) también aplica aquí, no solo al token de invitación.
    throw new OnboardingError('SESSION_ALREADY_COMPLETED', 'This onboarding session was already completed.');
  }

  await scope.onboardingSessions().updateByNonce(session.nonce, {
    metaSessionInfo: params.sessionInfo as never,
  });
}

// ---------------------------------------------------------------------------
// onboarding/complete — intercambio de código, validación, persistencia
// ---------------------------------------------------------------------------

export type CompleteOnboardingResult = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
};

export async function completeOnboarding(
  deps: OnboardingDeps,
  params: { sessionToken: string; authorizationCode: string },
): Promise<CompleteOnboardingResult> {
  const { scope, session, tenantId } = await loadSessionOrThrow(deps, params.sessionToken);

  if (session.state === 'OPERATIONAL') {
    throw new OnboardingError('SESSION_ALREADY_COMPLETED', 'This onboarding session was already completed.');
  }

  const sessionInfo = session.metaSessionInfo as SessionInfoInput | null;
  if (!sessionInfo?.wabaId) {
    throw new OnboardingError('MISSING_SESSION_INFO', 'No WABA session info was recorded for this session yet.');
  }

  // --- 1. Intercambio de código -------------------------------------------
  let accessToken: string;
  try {
    const exchange = await deps.graphClient.exchangeCodeForAccessToken(params.authorizationCode);
    accessToken = exchange.accessToken;
  } catch (error) {
    await scope.onboardingSessions().updateByNonce(session.nonce, {
      state: 'RECOVERABLE_ERROR',
      failureReason: 'CODE_EXCHANGE_FAILED',
    });
    if (error instanceof MetaGraphApiError) {
      throw new OnboardingError('CODE_EXCHANGE_FAILED', 'Failed to exchange the authorization code.');
    }
    throw error;
  }

  // --- 2. Resolver el usuario de Meta que autorizó ------------------------
  let metaUserId: string;
  try {
    metaUserId = await deps.graphClient.getAuthorizingUserId(accessToken);
  } catch (error) {
    await scope.onboardingSessions().updateByNonce(session.nonce, {
      state: 'RECOVERABLE_ERROR',
      failureReason: 'USER_LOOKUP_FAILED',
    });
    if (error instanceof MetaGraphApiError) {
      throw new OnboardingError('USER_LOOKUP_FAILED', 'Failed to resolve the authorizing Meta user.');
    }
    throw error;
  }

  // --- 3. Validar los números de la WABA ----------------------------------
  let phoneNumbers;
  try {
    phoneNumbers = await deps.graphClient.getWabaPhoneNumbers(sessionInfo.wabaId, accessToken);
  } catch (error) {
    await scope.onboardingSessions().updateByNonce(session.nonce, {
      state: 'RECOVERABLE_ERROR',
      failureReason: 'WABA_LOOKUP_FAILED',
    });
    if (error instanceof MetaGraphApiError) {
      throw new OnboardingError('WABA_LOOKUP_FAILED', 'Failed to look up phone numbers for the authorized WABA.');
    }
    throw error;
  }

  if (phoneNumbers.length === 0) {
    await scope.onboardingSessions().updateByNonce(session.nonce, { state: 'RECOVERABLE_ERROR', failureReason: 'NO_PHONE_NUMBERS' });
    throw new OnboardingError('NO_PHONE_NUMBERS', 'The authorized WABA has no phone numbers.');
  }

  // Si se conoce un phoneNumberId específico del Session Info, se usa ese;
  // si no, se exige que haya exactamente un número Coexistence real —
  // nunca se asume "el primero de la lista" sin verificar is_on_biz_app.
  const candidate = sessionInfo.phoneNumberId
    ? phoneNumbers.find((p) => p.id === sessionInfo.phoneNumberId)
    : phoneNumbers.find((p) => p.isOnBizApp);

  if (!candidate) {
    await scope.onboardingSessions().updateByNonce(session.nonce, { state: 'RECOVERABLE_ERROR', failureReason: 'PHONE_NUMBER_NOT_FOUND' });
    throw new OnboardingError('PHONE_NUMBER_NOT_FOUND', 'Could not find the expected phone number in the authorized WABA.');
  }

  // Verificación explícita del modelo de cuentas v4 (docs/META_V4_COMPATIBILITY.md
  // §4) — nunca se asume éxito silenciosamente si la conexión resultante no
  // es realmente Coexistence.
  if (!candidate.isOnBizApp) {
    await scope.onboardingSessions().updateByNonce(session.nonce, { state: 'RECOVERABLE_ERROR', failureReason: 'NOT_COEXISTENCE' });
    throw new OnboardingError(
      'NOT_COEXISTENCE',
      'The authorized number is not connected via Coexistence (is_on_biz_app is false) — refusing to proceed to avoid disabling WhatsApp Business app access.',
    );
  }

  // --- 4. Persistencia cifrada ---------------------------------------------
  const encryptedAccessToken = encryptToken(accessToken, deps.encryptionKey);

  let result;
  try {
    result = await scope.metaAuthorizations().completeAuthorization({
      metaUserId,
      onboardingSessionId: session.id,
      wabaId: sessionInfo.wabaId,
      phoneNumberId: candidate.id,
      displayPhoneNumber: candidate.displayPhoneNumber,
      isOnBizApp: candidate.isOnBizApp,
      platformType: candidate.platformType,
      encryptedAccessToken,
    });
  } catch (error) {
    if (error instanceof PhoneAlreadyConnectedError) {
      await scope.onboardingSessions().updateByNonce(session.nonce, { state: 'RECOVERABLE_ERROR', failureReason: 'PHONE_ALREADY_CONNECTED' });
      throw new OnboardingError('PHONE_ALREADY_CONNECTED', error.message);
    }
    throw error;
  }

  // --- 5. Suscribir la app a los eventos de la WABA -----------------------
  try {
    await ensureWabaSubscription({
      prisma: deps.prisma,
      tenantId,
      wabaId: sessionInfo.wabaId,
      graphClient: deps.graphClient,
      encryptionKey: deps.encryptionKey,
    });
  } catch (error) {
    // La conexión YA se persistió — un fallo aquí es recuperable (se puede
    // reintentar la suscripción sin repetir el intercambio de código), no
    // debe deshacer lo ya guardado.
    await scope.onboardingSessions().updateByNonce(session.nonce, { state: 'RECOVERABLE_ERROR', failureReason: 'SUBSCRIBE_FAILED' });
    if (error instanceof MetaGraphApiError) {
      throw new OnboardingError('SUBSCRIBE_FAILED', 'Connection saved, but subscribing to WABA events failed — retry needed.');
    }
    throw error;
  }

  await scope.onboardingSessions().updateByNonce(session.nonce, { state: 'OPERATIONAL' });

  void tenantId; // ya usado arriba vía `scope`; conservado por claridad de la firma de loadSessionOrThrow

  return {
    wabaId: sessionInfo.wabaId,
    phoneNumberId: candidate.id,
    displayPhoneNumber: candidate.displayPhoneNumber,
  };
}
