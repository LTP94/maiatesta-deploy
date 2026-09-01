import {
  extractSignedRequestField,
  verifySignedRequest,
  SignedRequestError,
  errorResponseForSignedRequestError,
  genericServerErrorResponse,
} from '../../../server/meta/facebook/signed-request';
import { getMetaAppSecret, MetaConfigError } from '../../../server/meta/config';
import { processDeauthorization } from '../../../server/meta/facebook/deauthorization-service';

// Only POST is exported — Vercel's Web Handler runtime auto-returns 405 for
// any other method, already proven empirically by /api/meta/health.
export async function POST(request: Request) {
  let appSecret: string;
  try {
    appSecret = getMetaAppSecret();
  } catch (error) {
    if (error instanceof MetaConfigError) {
      return genericServerErrorResponse();
    }
    throw error;
  }

  try {
    const signedRequestField = await extractSignedRequestField(request);
    const payload = verifySignedRequest(signedRequestField, appSecret);

    const userId = payload.user_id;
    if (typeof userId !== 'string' || userId.length === 0) {
      return errorResponseForSignedRequestError(
        new SignedRequestError('malformed', 'Missing user_id in payload.'),
      );
    }

    // NO_STORED_AUTHORIZATION_DATA is the correct, honest outcome right now
    // — see server/meta/facebook/deauthorization-service.ts for the P0 gate
    // this must be connected to before real Meta data is ever persisted.
    await processDeauthorization(userId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof SignedRequestError) {
      return errorResponseForSignedRequestError(error);
    }
    return genericServerErrorResponse();
  }
}
