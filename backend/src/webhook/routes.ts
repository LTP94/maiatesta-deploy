import { timingSafeEqual } from 'node:crypto';
import express, { Router, type ErrorRequestHandler } from 'express';
import type { PrismaClient } from '@prisma/client';
import { incrementWebhookMetric } from './observability.js';
import { receiveWebhookPayload, WebhookPayloadError } from './receiver.js';
import { verifyWebhookSignature } from './signature.js';

export type WebhookRouterDeps = {
  prisma: PrismaClient;
  appSecret: string;
  verifyToken: string;
  payloadEncryptionKey: Buffer;
};

function secretEqual(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createWhatsappWebhookRouter(deps: WebhookRouterDeps): Router {
  const router = Router();

  router.get('/webhooks/meta/whatsapp', (req, res) => {
    const mode = typeof req.query['hub.mode'] === 'string' ? req.query['hub.mode'] : '';
    const token = typeof req.query['hub.verify_token'] === 'string' ? req.query['hub.verify_token'] : '';
    const challenge = typeof req.query['hub.challenge'] === 'string' ? req.query['hub.challenge'] : '';
    if (mode !== 'subscribe' || !challenge || !secretEqual(token, deps.verifyToken)) {
      res.status(403).json({ error: 'WEBHOOK_VERIFICATION_FAILED' });
      return;
    }
    res.status(200).type('text/plain').send(challenge);
  });

  router.post('/webhooks/meta/whatsapp', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      res.status(415).json({ error: 'CONTENT_TYPE_NOT_SUPPORTED' });
      return;
    }
    const signature = req.get('x-hub-signature-256');
    if (!verifyWebhookSignature(req.body, signature, deps.appSecret)) {
      incrementWebhookMetric('signatureErrors');
      res.status(401).json({ error: 'INVALID_SIGNATURE' });
      return;
    }

    try {
      const result = await receiveWebhookPayload({
        prisma: deps.prisma,
        rawBody: req.body,
        payloadEncryptionKey: deps.payloadEncryptionKey,
      });
      res.status(200).json({ status: 'accepted', ...result });
    } catch (error) {
      if (error instanceof WebhookPayloadError) {
        res.status(400).json({ error: error.code });
        return;
      }
      incrementWebhookMetric('storageErrors');
      req.log?.error({ err: error }, 'webhook_storage_failed');
      res.status(503).json({ error: 'TEMPORARY_STORAGE_FAILURE' });
    }
  });

  const rawBodyErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 413) {
      incrementWebhookMetric('validationErrors');
      res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
      return;
    }
    next(error);
  };
  router.use(rawBodyErrorHandler);

  return router;
}
