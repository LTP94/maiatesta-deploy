/**
 * Strict, fail-closed loaders for the public (frontend-safe) config values
 * the WhatsApp Embedded Signup entry page needs. All three values are public
 * by design (Meta requires App ID and Configuration ID in client-side
 * FB.init/FB.login calls) — this module exists to avoid scattering env var
 * reads across components, not to protect a secret.
 */

export class MetaWhatsappConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetaWhatsappConfigError';
  }
}

export function getMetaAppId(): string {
  const raw = process.env.META_APP_ID;

  if (!raw) {
    throw new MetaWhatsappConfigError('META_APP_ID is not configured.');
  }

  return raw;
}

export function getMetaEmbeddedSignupConfigId(): string {
  const raw = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;

  if (!raw) {
    throw new MetaWhatsappConfigError('META_EMBEDDED_SIGNUP_CONFIG_ID is not configured.');
  }

  return raw;
}

const GRAPH_API_VERSION_PATTERN = /^v\d{2,3}\.0$/;

export function getMetaGraphApiVersion(): string {
  const raw = process.env.META_GRAPH_API_VERSION;

  if (!raw) {
    throw new MetaWhatsappConfigError('META_GRAPH_API_VERSION is not configured.');
  }

  if (!GRAPH_API_VERSION_PATTERN.test(raw)) {
    throw new MetaWhatsappConfigError('META_GRAPH_API_VERSION must look like "v25.0".');
  }

  return raw;
}
