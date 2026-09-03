// Unit tests for the WhatsApp Embedded Signup pure logic module, run
// against a compiled copy of src/utils/metaEmbeddedSignup.ts (see
// package.json's test:meta-embedded-signup script). No DOM, no network,
// no real Facebook SDK — every function here is deterministic.

import {
  applyLoginResult,
  applySignupMessage,
  applyTimeout,
  createSignupAttempt,
  deriveSignupState,
  isAllowedSignupMessageOrigin,
  isRetryableSignupState,
  isTerminalSignupState,
  markLaunched,
  parseEmbeddedSignupMessage,
} from '../.tmp-test-build/metaEmbeddedSignup.js';

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

const coexistenceMessage = {
  type: 'WA_EMBEDDED_SIGNUP',
  event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
  version: 3,
  data: { waba_id: 'test-waba-id' },
};

// ---- origin allowlist -------------------------------------------------
{
  record('www.facebook.com accepted', isAllowedSignupMessageOrigin('https://www.facebook.com') === true);
  record('web.facebook.com accepted', isAllowedSignupMessageOrigin('https://web.facebook.com') === true);
  record('evilfacebook.com rejected', isAllowedSignupMessageOrigin('https://evilfacebook.com') === false);
  record(
    'facebook.com.evil.example rejected',
    isAllowedSignupMessageOrigin('https://facebook.com.evil.example') === false,
  );
  record(
    'http (non-https) www.facebook.com rejected',
    isAllowedSignupMessageOrigin('http://www.facebook.com') === false,
  );
  record('bare facebook.com rejected', isAllowedSignupMessageOrigin('https://facebook.com') === false);
}

// ---- message parsing -------------------------------------------------
{
  const parsed = parseEmbeddedSignupMessage(coexistenceMessage);
  record('parses object payload', parsed !== null && parsed.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING');
}
{
  const parsed = parseEmbeddedSignupMessage(JSON.stringify(coexistenceMessage));
  record('parses JSON-string payload', parsed !== null && parsed.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING');
}
{
  const parsed = parseEmbeddedSignupMessage('not valid json {{{');
  record('malformed JSON string rejected', parsed === null);
}
{
  const parsed = parseEmbeddedSignupMessage({ type: 'SOME_OTHER_WIDGET', event: 'FOO' });
  record('non-WA_EMBEDDED_SIGNUP type rejected', parsed === null);
}
{
  const parsed = parseEmbeddedSignupMessage({ type: 'WA_EMBEDDED_SIGNUP' });
  record('missing event field rejected', parsed === null);
}
{
  const parsed = parseEmbeddedSignupMessage(null);
  record('null payload rejected', parsed === null);
}
{
  const parsed = parseEmbeddedSignupMessage(42);
  record('number payload rejected', parsed === null);
}

// ---- attempt accumulator: both orderings converge ---------------------
{
  let attempt = markLaunched(createSignupAttempt());
  attempt = applySignupMessage(attempt, coexistenceMessage);
  attempt = applyLoginResult(attempt, { codeReceived: true });
  const state = deriveSignupState('ready', attempt);
  record('SESSION -> CODE converges on READY_FOR_BACKEND', state === 'READY_FOR_BACKEND');
}
{
  let attempt = markLaunched(createSignupAttempt());
  attempt = applyLoginResult(attempt, { codeReceived: true });
  attempt = applySignupMessage(attempt, coexistenceMessage);
  const state = deriveSignupState('ready', attempt);
  record('CODE -> SESSION converges on READY_FOR_BACKEND', state === 'READY_FOR_BACKEND');
}

// ---- partial signals stay waiting, not success/failure ----------------
{
  let attempt = markLaunched(createSignupAttempt());
  attempt = applySignupMessage(attempt, coexistenceMessage);
  const state = deriveSignupState('ready', attempt);
  record('session-only stays WAITING_FOR_META', state === 'WAITING_FOR_META');
}
{
  let attempt = markLaunched(createSignupAttempt());
  attempt = applyLoginResult(attempt, { codeReceived: true });
  const state = deriveSignupState('ready', attempt);
  record('code-only stays WAITING_FOR_META', state === 'WAITING_FOR_META');
}

// ---- wrong flow variant -------------------------------------------------
{
  let attempt = markLaunched(createSignupAttempt());
  attempt = applySignupMessage(attempt, { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH_ONLY_WABA_SHARING' });
  attempt = applyLoginResult(attempt, { codeReceived: true });
  const state = deriveSignupState('ready', attempt);
  record('generic FINISH + code -> WRONG_FLOW_VARIANT', state === 'WRONG_FLOW_VARIANT');
}

// ---- cancel / timeout / sdk failure / login failure -------------------
{
  let attempt = markLaunched(createSignupAttempt());
  attempt = applySignupMessage(attempt, { type: 'WA_EMBEDDED_SIGNUP', event: 'CANCEL' });
  record('CANCEL event -> CANCELLED', deriveSignupState('ready', attempt) === 'CANCELLED');
}
{
  let attempt = markLaunched(createSignupAttempt());
  attempt = applyLoginResult(attempt, { cancelled: true });
  record('login cancelled -> CANCELLED', deriveSignupState('ready', attempt) === 'CANCELLED');
}
{
  let attempt = markLaunched(createSignupAttempt());
  attempt = applyTimeout(attempt);
  record('timeout -> TIMED_OUT', deriveSignupState('ready', attempt) === 'TIMED_OUT');
}
{
  let attempt = markLaunched(createSignupAttempt());
  attempt = applyLoginResult(attempt, { failureCode: 'server_error' });
  record('login failureCode -> FAILED', deriveSignupState('ready', attempt) === 'FAILED');
}
{
  const attempt = createSignupAttempt();
  record('sdk failed -> SDK_FAILED regardless of attempt', deriveSignupState('failed', attempt) === 'SDK_FAILED');
}
{
  const attempt = createSignupAttempt();
  record('sdk loading, no attempt -> SDK_LOADING', deriveSignupState('loading', attempt) === 'SDK_LOADING');
  record('sdk ready, no attempt -> SDK_READY', deriveSignupState('ready', attempt) === 'SDK_READY');
}

// ---- convergence wins over a stale cancel/timeout ----------------------
{
  let attempt = markLaunched(createSignupAttempt());
  attempt = applySignupMessage(attempt, { type: 'WA_EMBEDDED_SIGNUP', event: 'CANCEL' });
  attempt = applySignupMessage(attempt, coexistenceMessage);
  attempt = applyLoginResult(attempt, { codeReceived: true });
  record(
    'convergence after a stale cancel still reaches READY_FOR_BACKEND',
    deriveSignupState('ready', attempt) === 'READY_FOR_BACKEND',
  );
}

// ---- terminal / retryable classification -------------------------------
{
  record('READY_FOR_BACKEND is terminal', isTerminalSignupState('READY_FOR_BACKEND') === true);
  record('WAITING_FOR_META is not terminal', isTerminalSignupState('WAITING_FOR_META') === false);
  record('SDK_READY is not terminal', isTerminalSignupState('SDK_READY') === false);
  record('CANCELLED is retryable', isRetryableSignupState('CANCELLED') === true);
  record('TIMED_OUT is retryable', isRetryableSignupState('TIMED_OUT') === true);
  record('WRONG_FLOW_VARIANT is retryable', isRetryableSignupState('WRONG_FLOW_VARIANT') === true);
  record('FAILED is retryable', isRetryableSignupState('FAILED') === true);
  record('SDK_FAILED is not retryable', isRetryableSignupState('SDK_FAILED') === false);
  record('READY_FOR_BACKEND is not retryable', isRetryableSignupState('READY_FOR_BACKEND') === false);
}

// ---- immutability: applySignupMessage/applyLoginResult never mutate input
{
  const original = createSignupAttempt();
  const originalSnapshot = { ...original };
  applySignupMessage(original, coexistenceMessage);
  applyLoginResult(original, { codeReceived: true });
  applyTimeout(original);
  record(
    'input attempt objects are never mutated',
    JSON.stringify(original) === JSON.stringify(originalSnapshot),
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
