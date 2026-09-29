import { getWebhookPayloadEncryptionKey } from './config/env.js';
import { getPrismaClient } from './db/client.js';
import { WebhookWorker } from './webhook/worker.js';

const worker = new WebhookWorker(getPrismaClient(), getWebhookPayloadEncryptionKey());
let stopping = false;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    stopping = true;
  });
}

while (!stopping) {
  const count = await worker.runOnce(10);
  if (count === 0) await new Promise((resolve) => setTimeout(resolve, 500));
}
