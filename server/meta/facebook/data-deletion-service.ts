/**
 * P0 — BEFORE PERSISTING ANY META USER-LINKED DATA:
 *
 * This is a stub. No Meta user, Business Access Token, WABA connection,
 * Phone Number connection, or authorization record is stored anywhere in
 * this app yet — so records_deleted: 0 is a truthful statement, not an
 * invented "nothing happened" response. Never claim data was deleted that
 * was never stored.
 *
 * Before the first client onboarding that persists any Meta-user-linked
 * data, this function MUST be connected to a real storage adapter that:
 *   - identifies which stored records (if any) belong to this app-scoped
 *     Meta user, following the same explicit
 *     Meta authorizer -> authorization -> tenant -> WABA -> phone numbers
 *     mapping used by the deauthorization service;
 *   - deletes only records whose relationship to the requesting person is
 *     identified — never end-user messages, another admin's account, a
 *     client's full CRM, or another tenant's data;
 *   - reports an honest records_deleted count and status.
 *
 * This is the P0 gate for the next release that adds real persistence.
 */
export async function processDataDeletion(
  _userId: string,
): Promise<{ recordsDeleted: number; status: 'completed' }> {
  return { recordsDeleted: 0, status: 'completed' };
}
