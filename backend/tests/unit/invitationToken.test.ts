import { describe, expect, it } from 'vitest';
import {
  InvitationTokenError,
  issueInvitationToken,
  verifyInvitationToken,
} from '../../src/access/invitationToken.js';

const SECRET = 'test-onboarding-session-secret-do-not-use-in-prod';
const OTHER_SECRET = 'a-completely-different-secret';

describe('invitationToken', () => {
  it('issues a token that verifies back to the same tenantId/adminUserId', () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);
    const payload = verifyInvitationToken(token, SECRET);
    expect(payload.tenantId).toBe('tenant-a');
    expect(payload.adminUserId).toBe('admin-a');
  });

  it('rejects a token signed with a different secret', () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);
    expect(() => verifyInvitationToken(token, OTHER_SECRET)).toThrow(InvitationTokenError);
  });

  it('rejects a tampered tenantId — proves a client cannot self-assign a different tenant', () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);
    const [signature, encodedPayload] = token.split('.');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    payload.tenantId = 'tenant-b'; // el ataque exacto que este mecanismo existe para prevenir
    const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    expect(() => verifyInvitationToken(`${signature}.${tamperedPayload}`, SECRET)).toThrow(/signature/i);
  });

  it('rejects an expired token', () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a', ttlSeconds: 60 }, SECRET);
    const farFuture = Date.now() + 120_000;
    expect(() => verifyInvitationToken(token, SECRET, farFuture)).toThrow(/expired/i);
  });

  it('accepts a token right up to (but not including) its expiry instant', () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a', ttlSeconds: 60 }, SECRET);
    const justBeforeExpiry = Date.now() + 59_000;
    expect(() => verifyInvitationToken(token, SECRET, justBeforeExpiry)).not.toThrow();
  });

  it('defaults to a 7-day TTL when none is specified', () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);
    const in6Days = Date.now() + 6 * 24 * 60 * 60 * 1000;
    const in8Days = Date.now() + 8 * 24 * 60 * 60 * 1000;
    expect(() => verifyInvitationToken(token, SECRET, in6Days)).not.toThrow();
    expect(() => verifyInvitationToken(token, SECRET, in8Days)).toThrow(/expired/i);
  });

  it('each issued token has a unique jti, even for the same tenant/admin', () => {
    const tokenA = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);
    const tokenB = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);
    const payloadA = verifyInvitationToken(tokenA, SECRET);
    const payloadB = verifyInvitationToken(tokenB, SECRET);
    expect(payloadA.jti).not.toBe(payloadB.jti);
  });

  it('rejects malformed tokens (missing separator, garbage payload, wrong shape)', () => {
    expect(() => verifyInvitationToken('no-separator-here', SECRET)).toThrow(InvitationTokenError);
    expect(() => verifyInvitationToken('a.b.c', SECRET)).toThrow(InvitationTokenError);
    expect(() => issueInvitationToken({ tenantId: '', adminUserId: 'admin-a' }, SECRET)).toThrow(InvitationTokenError);
  });

  it('never leaks tenantId/adminUserId in plaintext in the token string (base64url-encoded, not literal JSON)', () => {
    const token = issueInvitationToken({ tenantId: 'super-secret-tenant-slug', adminUserId: 'admin-a' }, SECRET);
    expect(token).not.toContain('super-secret-tenant-slug');
    expect(token).not.toContain('{');
  });
});
