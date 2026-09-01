// Black-box HTTP checks for the Meta Facebook lifecycle callbacks.
//
// Usage:
//   node scripts/check-meta-facebook-callbacks.mjs <baseUrl>
//
// Negative phase always runs (no secret needed to prove rejection). The
// valid-callback phase only runs if META_TEST_APP_SECRET and
// META_TEST_STATUS_SECRET are present in the environment — NEVER pass a
// secret as a CLI argument, NEVER print one. On Preview these are the
// throwaway test secrets configured there. This script must never be run
// against Production with real secrets in the environment.

import { createHmac } from 'node:crypto';

const baseUrl = process.argv[2] ?? 'https://www.maiatesta.com';
const deauthorizeUrl = new URL('/api/meta/facebook/deauthorize', baseUrl).toString();
const dataDeletionUrl = new URL('/api/meta/facebook/data-deletion', baseUrl).toString();

let passed = 0;
let failed = 0;

function record(name, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function requestNoRedirect(url, init) {
  return fetch(url, { ...init, redirect: 'manual' });
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signRequest(payloadObj, secret) {
  const encodedPayload = b64url(JSON.stringify(payloadObj));
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${signature}.${encodedPayload}`;
}

// ============================== Negative phase ==============================

async function checkGetRejected(url, label) {
  const response = await requestNoRedirect(url, { method: 'GET' });
  record(`${label}: GET -> 405`, response.status === 405, `got ${response.status}`);
}

async function checkMissingSignedRequest(url, label) {
  const response = await requestNoRedirect(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'not_signed_request=abc',
  });
  record(`${label}: missing signed_request -> 400`, response.status === 400, `got ${response.status}`);
}

async function checkDuplicateSignedRequest(url, label) {
  const response = await requestNoRedirect(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'signed_request=aaa&signed_request=bbb',
  });
  record(`${label}: duplicate signed_request -> 400`, response.status === 400, `got ${response.status}`);
}

async function checkWrongSignature(url, label) {
  const payload = { algorithm: 'HMAC-SHA256', user_id: 'nonexistent-test-user' };
  const encodedPayload = b64url(JSON.stringify(payload));
  const wrongSignature = b64url('definitely-not-the-right-signature');
  const response = await requestNoRedirect(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `signed_request=${encodeURIComponent(`${wrongSignature}.${encodedPayload}`)}`,
  });
  record(
    `${label}: wrong signature -> exactly 401`,
    response.status === 401,
    `got ${response.status} (500 here means broken config, not "acceptable")`,
  );
}

async function checkWrongContentType(url, label) {
  const response = await requestNoRedirect(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signed_request: 'abc.def' }),
  });
  record(`${label}: wrong content-type -> 415`, response.status === 415, `got ${response.status}`);
}

async function checkOversizedBody(url, label) {
  const oversized = 'signed_request=' + 'a'.repeat(20 * 1024);
  const response = await requestNoRedirect(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': String(Buffer.byteLength(oversized)),
    },
    body: oversized,
  });
  record(`${label}: oversized body -> 413`, response.status === 413, `got ${response.status}`);
}

async function checkNoRedirect(url, label) {
  const response = await requestNoRedirect(url, { method: 'POST' });
  record(`${label}: no redirect`, response.status !== 307 && response.status !== 308, `got ${response.status}`);
}

async function runNegativePhase() {
  console.log('\n=== Negative phase ===');
  for (const [url, label] of [
    [deauthorizeUrl, 'deauthorize'],
    [dataDeletionUrl, 'data-deletion'],
  ]) {
    await checkGetRejected(url, label);
    await checkMissingSignedRequest(url, label);
    await checkDuplicateSignedRequest(url, label);
    await checkWrongSignature(url, label);
    await checkWrongContentType(url, label);
    await checkOversizedBody(url, label);
    await checkNoRedirect(url, label);
  }
}

// ============================ Valid-callback phase ============================

async function runValidCallbackPhase(appSecret, statusSecret) {
  console.log('\n=== Valid-callback phase ===');

  const payload = { algorithm: 'HMAC-SHA256', user_id: 'check-script-test-user', issued_at: Math.floor(Date.now() / 1000) };
  const signedRequest = signRequest(payload, appSecret);
  const body = `signed_request=${encodeURIComponent(signedRequest)}`;

  const deauthResponse = await fetch(deauthorizeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const deauthJson = await deauthResponse.json().catch(() => null);
  record('deauthorize: valid request -> 200', deauthResponse.status === 200, `got ${deauthResponse.status}`);
  record('deauthorize: response is { ok: true }', deauthJson?.ok === true);

  const firstResponse = await fetch(dataDeletionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const firstJson = await firstResponse.json().catch(() => null);
  record('data-deletion: valid request -> 200', firstResponse.status === 200, `got ${firstResponse.status}`);
  record('data-deletion: response has non-empty url', typeof firstJson?.url === 'string' && firstJson.url.length > 0);
  record(
    'data-deletion: confirmation_code matches /^[a-f0-9]{32}$/',
    typeof firstJson?.confirmation_code === 'string' && /^[a-f0-9]{32}$/.test(firstJson.confirmation_code),
  );

  const responseText = JSON.stringify(firstJson ?? {});
  const forbiddenSubstrings = ['user_id', 'check-script-test-user', appSecret, statusSecret, '@'];
  const leaked = forbiddenSubstrings.find((needle) => needle && responseText.includes(needle));
  record('data-deletion: response contains no user_id/secret/PII-shaped strings', !leaked, leaked ? `found "${leaked}"` : undefined);

  const secondResponse = await fetch(dataDeletionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const secondJson = await secondResponse.json().catch(() => null);
  record(
    'data-deletion: identical request -> identical confirmation_code (idempotent)',
    firstJson?.confirmation_code === secondJson?.confirmation_code,
  );
  record('data-deletion: identical request -> identical url (idempotent)', firstJson?.url === secondJson?.url);

  if (typeof firstJson?.url === 'string') {
    const statusResponse = await fetch(firstJson.url);
    const statusHtml = await statusResponse.text();
    record('status url -> 200', statusResponse.status === 200, `got ${statusResponse.status}`);
    const leakedInHtml = forbiddenSubstrings.find((needle) => needle && statusHtml.includes(needle));
    record('status page contains no PII/secret-shaped strings', !leakedInHtml, leakedInHtml ? `found "${leakedInHtml}"` : undefined);
  }
}

// ============================== Main ==============================

await runNegativePhase();

const appSecret = process.env.META_TEST_APP_SECRET;
const statusSecret = process.env.META_TEST_STATUS_SECRET;

if (appSecret && statusSecret) {
  await runValidCallbackPhase(appSecret, statusSecret);
} else {
  console.log('\n=== Valid-callback phase SKIPPED ===');
  console.log('Set META_TEST_APP_SECRET and META_TEST_STATUS_SECRET in the environment to run it.');
  console.log('Never pass secrets as CLI arguments. Never run this phase against Production.');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
