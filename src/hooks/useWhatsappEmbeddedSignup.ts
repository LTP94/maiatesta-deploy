import { useCallback, useEffect, useRef, useState } from 'react';
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
  type SignupAttempt,
  type SignupState,
} from '../utils/metaEmbeddedSignup';

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

export type UseWhatsappEmbeddedSignupResult = {
  state: SignupState;
  canConnect: boolean;
  connect: () => void;
};

export function useWhatsappEmbeddedSignup(): UseWhatsappEmbeddedSignupResult {
  const [sdkStage, setSdkStage] = useState<SdkStage>('loading');
  const [attempt, setAttempt] = useState<SignupAttempt>(createSignupAttempt());

  const configRef = useRef<WhatsappConfig | null>(null);
  const attemptRef = useRef<SignupAttempt>(attempt);
  const launchInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<number | undefined>(undefined);

  const state = deriveSignupState(sdkStage, attempt);

  const updateAttempt = useCallback((updater: (current: SignupAttempt) => SignupAttempt) => {
    const next = updater(attemptRef.current);
    attemptRef.current = next;
    if (mountedRef.current) {
      setAttempt(next);
    }
  }, []);

  const clearWaitingTimeout = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  // Clear any pending timeout as soon as the attempt resolves — a
  // convergence or cancellation that arrives just before the timer fires
  // must win, never a stale TIMED_OUT after the real outcome is known.
  useEffect(() => {
    if (isTerminalSignupState(state)) {
      clearWaitingTimeout();
    }
  }, [state, clearWaitingTimeout]);

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;

    async function loadConfigAndSdk() {
      try {
        const response = await fetch('/api/meta/whatsapp/config', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Config request failed with status ${response.status}`);
        }
        const config = (await response.json()) as WhatsappConfig;
        if (cancelled || !mountedRef.current) {
          return;
        }
        configRef.current = config;
      } catch {
        if (!cancelled && mountedRef.current) {
          setSdkStage('failed');
        }
        return;
      }

      window.fbAsyncInit = () => {
        if (!mountedRef.current || !configRef.current) {
          return;
        }
        window.FB?.init({
          appId: configRef.current.appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: configRef.current.graphApiVersion,
        });
        setSdkStage('ready');
      };

      if (document.getElementById(FACEBOOK_SDK_SCRIPT_ID)) {
        return;
      }

      const script = document.createElement('script');
      script.id = FACEBOOK_SDK_SCRIPT_ID;
      script.src = FACEBOOK_SDK_SRC;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        if (mountedRef.current) {
          setSdkStage('failed');
        }
      };
      document.body.appendChild(script);
    }

    void loadConfigAndSdk();

    function handleMessage(event: MessageEvent) {
      if (!isAllowedSignupMessageOrigin(event.origin)) {
        return;
      }
      if (!attemptRef.current.launched) {
        return;
      }
      const message = parseEmbeddedSignupMessage(event.data);
      if (!message) {
        return;
      }
      updateAttempt((current) => applySignupMessage(current, message));
    }

    window.addEventListener('message', handleMessage);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      window.removeEventListener('message', handleMessage);
      clearWaitingTimeout();
    };
    // Runs once on mount; all internal reads go through refs so this never
    // needs to re-run when attempt/state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateAttempt, clearWaitingTimeout]);

  const connect = useCallback(() => {
    if (launchInFlightRef.current) {
      return;
    }
    const config = configRef.current;
    const fb = window.FB;
    if (sdkStage !== 'ready' || !config || !fb) {
      return;
    }
    if (!isRetryableSignupState(state) && state !== 'SDK_READY') {
      return;
    }

    launchInFlightRef.current = true;
    const freshAttempt = markLaunched(createSignupAttempt());
    attemptRef.current = freshAttempt;
    setAttempt(freshAttempt);

    // Synchronous call within the click handler's call stack — no await/
    // promise/timer before this point, or the popup will be blocked.
    fb.login(
      (response) => {
        launchInFlightRef.current = false;
        if (!mountedRef.current) {
          return;
        }
        const code = response?.authResponse?.code;
        const codeReceived = typeof code === 'string' && code.length > 0;
        // The code value itself is never read again after this check —
        // only the boolean fact that one arrived is kept.
        if (codeReceived) {
          updateAttempt((current) => applyLoginResult(current, { codeReceived: true }));
        } else {
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
      if (!mountedRef.current) {
        return;
      }
      launchInFlightRef.current = false;
      updateAttempt((current) => applyTimeout(current));
    }, WAITING_FOR_META_TIMEOUT_MS);
  }, [sdkStage, state, updateAttempt, clearWaitingTimeout]);

  const canConnect =
    sdkStage === 'ready' && (state === 'SDK_READY' || isRetryableSignupState(state));

  return { state, canConnect, connect };
}
