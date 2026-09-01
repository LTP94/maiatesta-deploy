import { createHmac } from 'node:crypto';
import {
  extractSignedRequestField,
  verifySignedRequest,
  SignedRequestError,
  errorResponseForSignedRequestError,
  genericServerErrorResponse,
} from '../../../server/meta/facebook/signed-request';
import { issueStatusToken } from '../../../server/meta/facebook/data-deletion-status-token';
import {
  getMetaAppSecret,
  getDataDeletionStatusKey,
  getMetaPublicBaseUrl,
  MetaConfigError,
} from '../../../server/meta/config';
import { processDataDeletion } from '../../../server/meta/facebook/data-deletion-service';

// Only POST is exported — Vercel auto-405s everything else.
export async function POST(request: Request) {
  let appSecret: string;
  let statusKey: Buffer;
  let publicBaseUrl: string;
  try {
    appSecret = getMetaAppSecret();
    statusKey = getDataDeletionStatusKey();
    publicBaseUrl = getMetaPublicBaseUrl();
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

    // records_deleted: 0 / status: completed is honest — nothing is stored
    // yet. See server/meta/facebook/data-deletion-service.ts for the P0
    // gate this must be connected to before real Meta data is persisted.
    await processDataDeletion(userId);

    // Deterministic: the same signed_request always yields the same
    // confirmation code, so a Meta retry of an identical request is
    // provably idempotent even with zero database. Opaque 128-bit hex id,
    // reveals nothing about user_id, not reversible.
    const confirmationCode = createHmac('sha256', statusKey)
      .update(signedRequestField)
      .digest('hex')
      .slice(0, 32);

    const token = issueStatusToken(
      { v: 1, confirmationCode, status: 'completed' },
      statusKey,
    );
    const url = `${publicBaseUrl}/api/meta/facebook/data-deletion/status?token=${encodeURIComponent(token)}`;

    return new Response(
      JSON.stringify({ url, confirmation_code: confirmationCode }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch (error) {
    if (error instanceof SignedRequestError) {
      return errorResponseForSignedRequestError(error);
    }
    return genericServerErrorResponse();
  }
}
