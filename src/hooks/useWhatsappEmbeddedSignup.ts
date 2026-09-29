import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyLoginResult,
  applySignupMessage,
  applyTimeout,
  createSignupAttempt,
  deriveSignupState,
  extractEmbeddedSignupSessionInfo,
  isAllowedSignupMessageOrigin,
  isRetryableSignupState,
  isTerminalSignupState,
  markLaunched,
  parseEmbeddedSignupMessage,
  type SignupAttempt,
  type SignupState,
} from '../utils/metaEmbeddedSignup';
import {
  createWhatsappOnboardingApi,
  EmbeddedSignupCoordinator,
  isExpiredOnboardingError,
  OnboardingApiError,
  readInvitationTokenFromHash,
  type CoordinatorOutcome,
} from '../utils/whatsappOnboardingClient';

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { code?: string } | null;
          status?: string;
        }) => void,
        options: {
          config_id: string;
          response_type: 'code';
          override_default_response_type: true;
          extras: {
            setup: Record<string, never>;
            featureType: string;
            sessionInfoVersion: string;
          };
        },
      ) => void;
    };
  }
}

const FACEBOOK_SDK_SCRIPT_ID = 'facebook-jssdk';
const FACEBOOK_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';
const WAITING_FOR_META_TIMEOUT_MS = 15 * 60 * 1000;

type WhatsappConfig = {
  appId: string;
  configurationId: string;
  graphApiVersion: string;
};

type SdkStage = 'loading' | 'ready' | 'failed';
type BackendStage =
  | 'preparing'
  | 'ready'
  | 'processing'
  | 'connected'
  | 'invitation-required'
  | 'expired'
  | 'failed';

export type UseWhatsappEmbeddedSignupResult = {
  state: SignupState;
  canConnect: boolean;
  connect: () => void;
};

function stateForStages(
  backendStage: BackendStage,
  sdkStage: SdkStage,
  attempt: SignupAttempt,
): SignupState {
  if (backendStage === 'invitation-required') return 'INVITATION_REQUIRED';
  if (backendStage === 'preparing') return 'PREPARING_SESSION';
  if (backendStage === 'processing') return 'BACKEND_PROCESSING';
  if (backendStage === 'connected') return 'CONNECTED';
  if (backendStage === 'expired') return 'SESSION_EXPIRED';
  if (backendStage === 'failed') return 'BACKEND_FAILED';
  return deriveSignupState(sdkStage, attempt);
}

export function useWhatsappEmbeddedSignup(): UseWhatsappEmbeddedSignupResult {
  const [sdkStage, setSdkStage] = useState<SdkStage>('loading');
  const [backendStage, setBackendStage] = useState<BackendStage>('preparing');
  const [attempt, setAttempt] = useState<SignupAttempt>(createSignupAttempt());

  const configRef = useRef<WhatsappConfig | null>(null);
  const coordinatorRef = useRef<EmbeddedSignupCoordinator | null>(null);
  // `undefined` means "not read yet". Keeping the initial fragment value in
  // a ref lets React development StrictMode perform its setup/cleanup/setup
  // probe without consuming the one-use invitation twice. It remains memory-
  // only and is cleared as soon as /onboarding/start resolves.
  const invitationTokenRef = useRef<string | null | undefined>(undefined);
  const backendInitializedRef = useRef(false);
  const backendCleanupTimeoutRef = useRef<number | undefined>(undefined);
  const startControllerRef = useRef<AbortController | null>(null);
  const attemptRef = useRef<SignupAttempt>(attempt);
  const launchInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<number | undefined>(undefined);
  const sessionExpiryTimeoutRef = useRef<number | undefined>(undefined);

  const state = stateForStages(backendStage, sdkStage, attempt);

  const updateAttempt = useCallback((updater: (current: SignupAttempt) => SignupAttempt) => {
    const next = updater(attemptRef.current);
    attemptRef.current = next;
    if (mountedRef.current) setAttempt(next);
  }, []);

  const clearWaitingTimeout = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const handleCoordinatorResult = useCallback(
    async (operation: Promise<CoordinatorOutcome>) => {
      if (mountedRef.current) setBackendStage('processing');
      try {
        const outcome = await operation;
        if (!mountedRef.current) return;
        if (outcome.status === 'connected') {
          clearWaitingTimeout();
          if (sessionExpiryTimeoutRef.current !== undefined) {
            window.clearTimeout(sessionExpiryTimeoutRef.current);
            sessionExpiryTimeoutRef.current = undefined;
          }
          launchInFlightRef.current = false;
          setBackendStage('connected');
        } else {
          setBackendStage('ready');
        }
      } catch (error) {
        if (!mountedRef.current || (error instanceof DOMException && error.name === 'AbortError')) return;
        clearWaitingTimeout();
        launchInFlightRef.current = false;
        coordinatorRef.current?.cancelAttempt();
        setBackendStage(isExpiredOnboardingError(error) ? 'expired' : 'failed');
      }
    },
    [clearWaitingTimeout],
  );

  useEffect(() => {
    if (backendCleanupTimeoutRef.current !== undefined) {
      window.clearTimeout(backendCleanupTimeoutRef.current);
      backendCleanupTimeoutRef.current = undefined;
    }
    mountedRef.current = true;

    const scheduleCleanup = () => {
      mountedRef.current = false;
      // React StrictMode immediately mounts again after its development-only
      // cleanup probe. Deferring one task prevents a second /start call while
      // still aborting and wiping memory on a real unmount.
      backendCleanupTimeoutRef.current = window.setTimeout(() => {
        startControllerRef.current?.abort();
        startControllerRef.current = null;
        coordinatorRef.current?.dispose();
        coordinatorRef.current = null;
        if (sessionExpiryTimeoutRef.current !== undefined) {
          window.clearTimeout(sessionExpiryTimeoutRef.current);
        }
      }, 0);
    };

    if (backendInitializedRef.current) {
      return scheduleCleanup;
    }
    backendInitializedRef.current = true;

    const startController = new AbortController();
    startControllerRef.current = startController;
    if (invitationTokenRef.current === undefined) {
      invitationTokenRef.current = readInvitationTokenFromHash(window.location.hash);
    }
    const invitationToken = invitationTokenRef.current;

    // URL fragments are never sent in HTTP requests. Remove the invitation
    // immediately so it cannot remain in browser history, screenshots, or a
    // copied URL; the value is retained only in this local variable until POST.
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}`,
      );
    }

    if (!invitationToken) {
      setBackendStage('invitation-required');
      return scheduleCleanup;
    }

    try {
      const api = createWhatsappOnboardingApi({
        baseUrl: import.meta.env.VITE_WHATSAPP_BACKEND_URL,
      });
      const coordinator = new EmbeddedSignupCoordinator(api);
      coordinatorRef.current = coordinator;

      void api
        .start(invitationToken, startController.signal)
        .then((session) => {
          invitationTokenRef.current = null;
          if (!mountedRef.current) return;
          coordinator.beginSession(session);
          setBackendStage('ready');

          const remainingMs = Date.parse(session.expiresAt) - Date.now();
          sessionExpiryTimeoutRef.current = window.setTimeout(() => {
            coordinator.dispose();
            if (mountedRef.current) setBackendStage('expired');
          }, Math.max(0, remainingMs));
        })
        .catch((error: unknown) => {
          if (!mountedRef.current || (error instanceof DOMException && error.name === 'AbortError')) return;
          invitationTokenRef.current = null;
          setBackendStage(
            error instanceof OnboardingApiError && error.code === 'INVALID_INVITATION'
              ? 'invitation-required'
              : 'failed',
          );
        });
    } catch {
      invitationTokenRef.current = null;
      setBackendStage('failed');
    }

    return scheduleCleanup;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadConfigAndSdk() {
      try {
        const response = await fetch('/api/meta/whatsapp/config', { cache: 'no-store' });
        if (!response.ok) throw new Error('Config request failed.');
        const config = (await response.json()) as WhatsappConfig;
        if (cancelled || !mountedRef.current) return;
        configRef.current = config;
      } catch {
        if (!cancelled && mountedRef.current) setSdkStage('failed');
        return;
      }

      const initializeSdk = () => {
        if (!mountedRef.current || !configRef.current || !window.FB) return;
        window.FB.init({
          appId: configRef.current.appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: configRef.current.graphApiVersion,
        });
        setSdkStage('ready');
      };

      window.fbAsyncInit = initializeSdk;
      if (window.FB) {
        initializeSdk();
        return;
      }
      if (document.getElementById(FACEBOOK_SDK_SCRIPT_ID)) return;

      const script = document.createElement('script');
      script.id = FACEBOOK_SDK_SCRIPT_ID;
      script.src = FACEBOOK_SDK_SRC;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        if (mountedRef.current) setSdkStage('failed');
      };
      document.body.appendChild(script);
    }

    void loadConfigAndSdk();

    function handleMessage(event: MessageEvent) {
      if (!isAllowedSignupMessageOrigin(event.origin) || !attemptRef.current.launched) return;
      const current = attemptRef.current;
      if (
        current.cancelled ||
        current.timedOut ||
        current.failureCode ||
        current.wrongFlowVariant ||
        (current.sessionFinished && current.codeReceived)
      ) return;

      const message = parseEmbeddedSignupMessage(event.data);
      if (!message) return;

      const nextAttempt = applySignupMessage(current, message);
      updateAttempt(() => nextAttempt);

      const sessionInfo = extractEmbeddedSignupSessionInfo(message);
      if (sessionInfo && coordinatorRef.current) {
        void handleCoordinatorResult(coordinatorRef.current.acceptSessionInfo(sessionInfo));
      } else if (
        nextAttempt.cancelled ||
        nextAttempt.wrongFlowVariant ||
        nextAttempt.failureCode
      ) {
        launchInFlightRef.current = false;
        coordinatorRef.current?.cancelAttempt();
      }
    }

    window.addEventListener('message', handleMessage);
    return () => {
      cancelled = true;
      window.removeEventListener('message', handleMessage);
      clearWaitingTimeout();
    };
  }, [updateAttempt, clearWaitingTimeout, handleCoordinatorResult]);

  useEffect(() => {
    if (isTerminalSignupState(state)) clearWaitingTimeout();
  }, [state, clearWaitingTimeout]);

  const connect = useCallback(() => {
    if (launchInFlightRef.current) return;
    const config = configRef.current;
    const fb = window.FB;
    const mayRetryBackend = backendStage === 'failed';
    if (sdkStage !== 'ready' || !config || !fb || (backendStage !== 'ready' && !mayRetryBackend)) return;
    if (!isRetryableSignupState(state) && state !== 'SDK_READY') return;

    coordinatorRef.current?.cancelAttempt();
    setBackendStage('ready');
    launchInFlightRef.current = true;
    const freshAttempt = markLaunched(createSignupAttempt());
    attemptRef.current = freshAttempt;
    setAttempt(freshAttempt);

    // Must remain synchronous within the click call stack or browsers may
    // block Meta's popup. No network request or await occurs before FB.login.
    fb.login(
      (response) => {
        launchInFlightRef.current = false;
        if (!mountedRef.current) return;
        const current = attemptRef.current;
        if (current.cancelled || current.timedOut || current.failureCode || current.wrongFlowVariant) {
          coordinatorRef.current?.cancelAttempt();
          return;
        }
        const code = response?.authResponse?.code;
        if (typeof code === 'string' && code.length > 0 && coordinatorRef.current) {
          updateAttempt((current) => applyLoginResult(current, { codeReceived: true }));
          void handleCoordinatorResult(coordinatorRef.current.acceptAuthorizationCode(code));
        } else {
          coordinatorRef.current?.cancelAttempt();
          updateAttempt((current) => applyLoginResult(current, { cancelled: true }));
        }
      },
      {
        config_id: config.configurationId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      },
    );

    clearWaitingTimeout();
    timeoutRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      launchInFlightRef.current = false;
      coordinatorRef.current?.cancelAttempt();
      updateAttempt((current) => applyTimeout(current));
    }, WAITING_FOR_META_TIMEOUT_MS);
  }, [sdkStage, backendStage, state, updateAttempt, clearWaitingTimeout, handleCoordinatorResult]);

  const canConnect =
    sdkStage === 'ready' &&
    (backendStage === 'ready' || backendStage === 'failed') &&
    (state === 'SDK_READY' || isRetryableSignupState(state));

  return { state, canConnect, connect };
}
