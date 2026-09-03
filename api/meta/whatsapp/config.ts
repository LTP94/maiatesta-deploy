import {
  getMetaAppId,
  getMetaEmbeddedSignupConfigId,
  getMetaGraphApiVersion,
  MetaWhatsappConfigError,
} from '../../../server/meta/whatsapp/config.js';

/**
 * Public, no-secret config for the Embedded Signup entry page. appId and
 * configurationId are public by design (Meta requires them client-side).
 * requestedFlow reflects only what we ask Meta for, not a confirmed fact —
 * whether Meta actually offers Coexistence is proven, not assumed, in the
 * Phase C manual test.
 */
export function GET() {
  try {
    const body = {
      appId: getMetaAppId(),
      configurationId: getMetaEmbeddedSignupConfigId(),
      graphApiVersion: getMetaGraphApiVersion(),
      requestedFlow: 'coexistence',
    };

    return Response.json(body, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof MetaWhatsappConfigError) {
      // error.message names only which of the three public, non-secret env
      // vars is missing/malformed (never a raw value) — safe to surface,
      // and the only way to diagnose this without server log access.
      return Response.json(
        { error: 'CONFIGURATION_ERROR', detail: error.message },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    throw error;
  }
}
