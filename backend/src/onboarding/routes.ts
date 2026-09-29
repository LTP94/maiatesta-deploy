import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { InvitationTokenError } from '../access/invitationToken.js';
import { getPrismaClient } from '../db/client.js';
import { getRedisClient } from '../redis/client.js';
import {
  getInvitationTokenSecret,
  getMetaAppId,
  getMetaAppSecret,
  getMetaGraphApiVersion,
  getOnboardingSessionSecret,
  getTokenEncryptionKey,
} from '../config/env.js';
import { MetaGraphClient } from '../meta/graphClient.js';
import { OnboardingError, completeOnboarding, recordSessionInfo, startOnboarding, type OnboardingDeps } from './service.js';

/**
 * Rutas públicas de onboarding — deliberadamente sin cabecera de
 * autenticación de admin: la única autorización aquí es poseer un
 * invitationToken (para /start) o un sessionToken (para /session,
 * /complete), ambos verificados dentro de service.ts. Ver
 * access/invitationToken.ts para por qué esto no necesita CSRF tradicional.
 */

let depsSingleton: OnboardingDeps | undefined;

function getOnboardingDeps(): OnboardingDeps {
  if (!depsSingleton) {
    depsSingleton = {
      prisma: getPrismaClient(),
      redis: getRedisClient(),
      graphClient: new MetaGraphClient({
        graphApiVersion: getMetaGraphApiVersion(),
        appId: getMetaAppId(),
        appSecret: getMetaAppSecret(),
      }),
      invitationSecret: getInvitationTokenSecret(),
      sessionSecret: getOnboardingSessionSecret(),
      encryptionKey: getTokenEncryptionKey(),
    };
  }
  return depsSingleton;
}

const ERROR_STATUS_BY_CODE: Record<string, number> = {
  INVALID_SESSION_TOKEN: 401,
  SESSION_NOT_FOUND: 404,
  SESSION_EXPIRED: 410,
  SESSION_ALREADY_COMPLETED: 409,
  MISSING_SESSION_INFO: 400,
  CODE_EXCHANGE_FAILED: 502,
  USER_LOOKUP_FAILED: 502,
  WABA_LOOKUP_FAILED: 502,
  NO_PHONE_NUMBERS: 422,
  PHONE_NUMBER_NOT_FOUND: 422,
  NOT_COEXISTENCE: 422,
  PHONE_ALREADY_CONNECTED: 409,
  SUBSCRIBE_FAILED: 502,
};

// Ventana deliberadamente estrecha — /start es la única ruta que acepta un
// secreto de un solo uso repetidamente probable por fuerza bruta si no se
// limita (condición de seguridad de tokens de invitación, Etapa 2 punto 3).
const startRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const startSchema = z.object({
  invitationToken: z.string().min(1),
});

const sessionInfoSchema = z.object({
  businessId: z.string().min(1).optional(),
  wabaId: z.string().min(1).optional(),
  phoneNumberId: z.string().min(1).optional(),
});

const sessionSchema = z.object({
  sessionToken: z.string().min(1),
  sessionInfo: sessionInfoSchema,
});

const completeSchema = z.object({
  sessionToken: z.string().min(1),
  authorizationCode: z.string().min(1),
});

export function createOnboardingRouter(deps: OnboardingDeps = getOnboardingDeps()): Router {
  const router = Router();

  router.post('/onboarding/start', startRateLimiter, async (req, res) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'invitationToken is required.' });
      return;
    }

    try {
      const result = await startOnboarding(deps, { invitationToken: parsed.data.invitationToken });
      res.status(201).json({ sessionToken: result.sessionToken, expiresAt: result.expiresAt.toISOString() });
    } catch (error) {
      if (error instanceof InvitationTokenError) {
        // Nunca se distingue en la respuesta entre "expirado", "ya usado" o
        // "firma inválida" — todas responden igual, para no dar pistas útiles
        // a un intento de fuerza bruta sobre el token (condición 6, Etapa 2:
        // "no exponen información sensible").
        res.status(401).json({ error: 'INVALID_INVITATION', message: 'Invitation token is invalid, expired, or already used.' });
        return;
      }
      req.log?.error({ err: error }, 'onboarding/start failed');
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Could not start onboarding.' });
    }
  });

  router.post('/onboarding/session', async (req, res) => {
    const parsed = sessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'sessionToken and sessionInfo are required.' });
      return;
    }

    try {
      await recordSessionInfo(deps, { sessionToken: parsed.data.sessionToken, sessionInfo: parsed.data.sessionInfo });
      res.status(204).end();
    } catch (error) {
      if (error instanceof OnboardingError) {
        res.status(ERROR_STATUS_BY_CODE[error.code] ?? 400).json({ error: error.code, message: error.message });
        return;
      }
      req.log?.error({ err: error }, 'onboarding/session failed');
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Could not record session info.' });
    }
  });

  router.post('/onboarding/complete', async (req, res) => {
    const parsed = completeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'sessionToken and authorizationCode are required.' });
      return;
    }

    try {
      const result = await completeOnboarding(deps, {
        sessionToken: parsed.data.sessionToken,
        authorizationCode: parsed.data.authorizationCode,
      });
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof OnboardingError) {
        res.status(ERROR_STATUS_BY_CODE[error.code] ?? 400).json({ error: error.code, message: error.message });
        return;
      }
      req.log?.error({ err: error }, 'onboarding/complete failed');
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Could not complete onboarding.' });
    }
  });

  return router;
}
