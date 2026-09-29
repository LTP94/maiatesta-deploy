export type WebhookMetric =
  | 'received'
  | 'stored'
  | 'duplicates'
  | 'quarantined'
  | 'validationErrors'
  | 'signatureErrors'
  | 'storageErrors'
  | 'processed'
  | 'retries'
  | 'deadLetters';

const counters: Record<WebhookMetric, number> = {
  received: 0,
  stored: 0,
  duplicates: 0,
  quarantined: 0,
  validationErrors: 0,
  signatureErrors: 0,
  storageErrors: 0,
  processed: 0,
  retries: 0,
  deadLetters: 0,
};

export function incrementWebhookMetric(metric: WebhookMetric, amount = 1): void {
  counters[metric] += amount;
}

export function getWebhookMetrics(): Readonly<Record<WebhookMetric, number>> {
  return { ...counters };
}

export function resetWebhookMetricsForTests(): void {
  for (const key of Object.keys(counters) as WebhookMetric[]) counters[key] = 0;
}
