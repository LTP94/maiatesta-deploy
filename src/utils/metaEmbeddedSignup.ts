/**
 * Pure logic for the WhatsApp Embedded Signup (Coexistence) frontend flow.
 * No DOM, no network, no React — everything here is unit-testable with
 * plain function calls, and every function is deterministic given its
 * inputs.
 *
 * FB.login's callback (delivers the authorization code) and the Coexistence
 * postMessage session event are two independent async channels that can
 * arrive in either order. SignupAttempt is an accumulator, not a linear
 * chain, so both CODE->SESSION and SESSION->CODE orderings converge on the
 * same derived state.
 */

export type SignupAttempt = {
  launched: boolean;
  sessionFinished: boolean;
  wrongFlowVariant: boolean;
  codeReceived: boolean;
  cancelled: boolean;
  timedOut: boolean;
  failureCode?: string;
};

export function createSignupAttempt(): SignupAttempt {
  return {
    launched: false,
    sessionFinished: false,
    wrongFlowVariant: false,
    codeReceived: false,
    cancelled: false,
    timedOut: false,
  };
}

export type SignupState =
  | 'SDK_LOADING'
  | 'SDK_READY'
  | 'WAITING_FOR_META'
  | 'READY_FOR_BACKEND'
  | 'WRONG_FLOW_VARIANT'
  | 'CANCELLED'
  | 'SDK_FAILED'
  | 'TIMED_OUT'
  | 'FAILED';

/**
 * Derives the UI state from the current SDK lifecycle stage plus the
 * attempt accumulator. sdkStage models everything before FB.login is
 * called; once launched, the attempt fields take over.
 */
export function deriveSignupState(
  sdkStage: 'loading' | 'ready' | 'failed',
  attempt: SignupAttempt,
): SignupState {
  if (sdkStage === 'failed') {
    return 'SDK_FAILED';
  }

  // Convergence wins over any other accumulator flag — once both signals
  // for a correct Coexistence completion are in, nothing that arrived
  // earlier in the same attempt (e.g. a stale cancel) should override it.
  if (attempt.sessionFinished && attempt.codeReceived) {
    return 'READY_FOR_BACKEND';
  }

  if (attempt.failureCode) {
    return 'FAILED';
  }

  if (attempt.cancelled) {
    return 'CANCELLED';
  }

  if (attempt.timedOut) {
    return 'TIMED_OUT';
  }

  if (attempt.wrongFlowVariant) {
    return 'WRONG_FLOW_VARIANT';
  }

  if (attempt.launched) {
    return 'WAITING_FOR_META';
  }

  if (sdkStage === 'ready') {
    return 'SDK_READY';
  }

  return 'SDK_LOADING';
}

const ALLOWED_MESSAGE_ORIGINS = new Set(['https://www.facebook.com', 'https://web.facebook.com']);

export function isAllowedSignupMessageOrigin(origin: string): boolean {
  return ALLOWED_MESSAGE_ORIGINS.has(origin);
}

export type EmbeddedSignupMessage = {
  type: 'WA_EMBEDDED_SIGNUP';
  event: string;
  version?: number;
  data?: Record<string, unknown>;
};

/**
 * Accepts event.data as either an already-parsed object or a JSON string
 * (Meta's docs show both forms in the wild). Rejects anything malformed or
 * not explicitly the WA_EMBEDDED_SIGNUP envelope — returns null rather than
 * throwing so a listener can safely ignore unrelated postMessage traffic
 * (browser extensions, other embeds, etc.) without crashing.
 */
export function parseEmbeddedSignupMessage(raw: unknown): EmbeddedSignupMessage | null {
  let value: unknown = raw;

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.type !== 'WA_EMBEDDED_SIGNUP') {
    return null;
  }

  if (typeof candidate.event !== 'string' || candidate.event.length === 0) {
    return null;
  }

  const message: EmbeddedSignupMessage = {
    type: 'WA_EMBEDDED_SIGNUP',
    event: candidate.event,
  };

  if (typeof candidate.version === 'number') {
    message.version = candidate.version;
  }

  if (typeof candidate.data === 'object' && candidate.data !== null) {
    message.data = candidate.data as Record<string, unknown>;
  }

  return message;
}

const COEXISTENCE_FINISH_EVENT = 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';
const CANCEL_EVENTS = new Set(['CANCEL']);

/**
 * Applies one parsed message to an attempt, returning a new attempt object
 * (never mutates its input, so callers can trivially diff old/new state).
 * A generic FINISH event that is not the Coexistence variant marks
 * wrongFlowVariant rather than being silently ignored — the popup did
 * something other than what we asked for and the UI must say so honestly.
 */
export function applySignupMessage(
  attempt: SignupAttempt,
  message: EmbeddedSignupMessage,
): SignupAttempt {
  if (message.event === COEXISTENCE_FINISH_EVENT) {
    return { ...attempt, sessionFinished: true };
  }

  if (message.event.startsWith('FINISH')) {
    return { ...attempt, wrongFlowVariant: true };
  }

  if (CANCEL_EVENTS.has(message.event)) {
    return { ...attempt, cancelled: true };
  }

  return attempt;
}

/**
 * Applies FB.login's callback result. code is checked only for
 * non-emptiness by the caller before this is invoked — this function never
 * receives or stores the code value itself, only the boolean fact that one
 * arrived.
 */
export function applyLoginResult(
  attempt: SignupAttempt,
  result: { codeReceived?: boolean; cancelled?: boolean; failureCode?: string },
): SignupAttempt {
  if (result.failureCode) {
    return { ...attempt, failureCode: result.failureCode };
  }

  if (result.cancelled) {
    return { ...attempt, cancelled: true };
  }

  if (result.codeReceived) {
    return { ...attempt, codeReceived: true };
  }

  return attempt;
}

export function markLaunched(attempt: SignupAttempt): SignupAttempt {
  return { ...attempt, launched: true };
}

export function applyTimeout(attempt: SignupAttempt): SignupAttempt {
  return { ...attempt, timedOut: true };
}

const TERMINAL_STATES = new Set<SignupState>([
  'READY_FOR_BACKEND',
  'WRONG_FLOW_VARIANT',
  'CANCELLED',
  'SDK_FAILED',
  'TIMED_OUT',
  'FAILED',
]);

export function isTerminalSignupState(state: SignupState): boolean {
  return TERMINAL_STATES.has(state);
}

const RETRYABLE_STATES = new Set<SignupState>([
  'WRONG_FLOW_VARIANT',
  'CANCELLED',
  'TIMED_OUT',
  'FAILED',
]);

export function isRetryableSignupState(state: SignupState): boolean {
  return RETRYABLE_STATES.has(state);
}
