/**
 * P0 — BEFORE PERSISTING ANY META AUTHORIZATION DATA:
 *
 * This is a stub. Maiatesta does not yet store Business Access Tokens,
 * Facebook user profiles, WABA connections, Phone Number IDs, OAuth
 * sessions, or any Meta record in a database — so there is nothing to
 * revoke yet, and NO_STORED_AUTHORIZATION_DATA is a correct, honest
 * outcome, not a placeholder failure.
 *
 * Once Embedded Signup starts persisting real Meta-user-linked data, this
 * function MUST be replaced with a real implementation that:
 *   - looks up the authorization record for this app-scoped Meta user;
 *   - invalidates it and deletes any stored tokens;
 *   - prevents new operations from using that authorization;
 *   - unlinks the authorizing user from the relevant tenant/WABA mapping
 *     when appropriate.
 *
 * Critical multi-tenant safety rule: an app-scoped Meta user is NOT the
 * same thing as a tenant, a WABA, a phone number, or a business. Never
 * implement this as `deleteTenant(userId)` or anything equivalent — only
 * the specific authorization tied to this Meta user may be touched. The
 * relationship that must exist and be explicitly checked before any
 * deletion is:
 *
 *   Meta authorizer -> authorization -> tenant -> WABA -> phone numbers
 *
 * This is the P0 gate for the next release that adds real persistence.
 */
export async function processDeauthorization(
  _userId: string,
): Promise<{ result: 'NO_STORED_AUTHORIZATION_DATA' }> {
  return { result: 'NO_STORED_AUTHORIZATION_DATA' };
}
