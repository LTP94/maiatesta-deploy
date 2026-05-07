import { createElement, useEffect, useRef, useState } from 'react';
import type { LocalizedContent } from '../data/siteContent';

const typebotScriptId = 'maiatesta-typebot-standard-script';

function applyTypebotSurfaceStyles() {
  const typebot = document.querySelector('typebot-standard');

  if (!(typebot instanceof HTMLElement) || !typebot.shadowRoot) {
    return false;
  }

  const shadowRoot = typebot.shadowRoot;
  const container = shadowRoot.querySelector('.typebot-container');
  const chatView = shadowRoot.querySelector('.typebot-chat-view');

  if (!(container instanceof HTMLElement) || !(chatView instanceof HTMLElement)) {
    return false;
  }

  container.style.setProperty('--typebot-container-bg-color', 'transparent');
  container.style.setProperty('--typebot-chat-container-opacity', '0');
  container.style.setProperty('--typebot-chat-container-border-width', '0');
  container.style.setProperty('--typebot-chat-container-border-radius', '0');
  container.style.setProperty('--typebot-chat-container-box-shadow', '0 0 #0000');
  container.style.setProperty('--typebot-host-bubble-bg-rgb', '20, 16, 14');
  container.style.setProperty('--typebot-host-bubble-opacity', '0.88');
  container.style.setProperty('--typebot-host-bubble-border-radius', '18px');
  container.style.setProperty(
    '--typebot-host-bubble-box-shadow',
    '0 20px 48px rgba(7, 14, 22, 0.24)',
  );
  container.style.setProperty('--typebot-input-bg-rgb', '16, 24, 33');
  container.style.setProperty('--typebot-input-opacity', '0.8');
  container.style.setProperty('--typebot-input-border-width', '1px');
  container.style.setProperty('--typebot-input-border-rgb', '232, 237, 242');
  container.style.setProperty('--typebot-input-border-opacity', '0.08');
  container.style.setProperty('--typebot-input-border-radius', '18px');
  container.style.setProperty(
    '--typebot-input-box-shadow',
    '0 18px 48px rgba(7, 14, 22, 0.24)',
  );
  container.style.setProperty('--typebot-button-border-radius', '999px');
  container.style.setProperty('--typebot-button-border-width', '1px');
  container.style.setProperty('--typebot-button-border-rgb', '232, 237, 242');
  container.style.setProperty('--typebot-button-border-opacity', '0.16');
  container.style.setProperty(
    '--typebot-button-box-shadow',
    '0 12px 32px rgba(194, 165, 109, 0.2)',
  );

  chatView.style.background = 'transparent';
  chatView.style.border = '0';
  chatView.style.borderRadius = '0';
  chatView.style.boxShadow = 'none';
  chatView.style.backdropFilter = 'none';

  return true;
}

export function TypebotStandardChat({ content }: { content: LocalizedContent }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [shouldLoadTypebot, setShouldLoadTypebot] = useState(false);

  useEffect(() => {
    if (!shouldLoadTypebot) {
      return;
    }

    let animationFrameId = 0;
    let retries = 0;
    let observer: MutationObserver | undefined;

    const syncTypebotStyles = () => {
      if (applyTypebotSurfaceStyles()) {
        return;
      }

      if (retries >= 60) {
        return;
      }

      retries += 1;
      animationFrameId = window.requestAnimationFrame(syncTypebotStyles);
    };

    if (document.getElementById(typebotScriptId)) {
      syncTypebotStyles();
      return;
    }

    const typebotInitScript = document.createElement('script');
    typebotInitScript.id = typebotScriptId;
    typebotInitScript.type = 'module';
    typebotInitScript.innerHTML = `import Typebot from 'https://cdn.jsdelivr.net/npm/@typebot.io/js@0/dist/web.js'
  
Typebot.initStandard({
  typebot: "my-typebot-fy5w3to",
  apiHost: "https://viewer.kipuxbot.com",
  theme: {
      chat: {
        host: {
          backgroundColor: "transparent" // ¡Aquí ocurre la magia!
        }
      }
    }
});
`;
    document.body.append(typebotInitScript);

    syncTypebotStyles();

    const host = document.querySelector('typebot-standard');

    if (host instanceof HTMLElement && host.shadowRoot) {
      observer = new MutationObserver(() => {
        applyTypebotSurfaceStyles();
      });

      observer.observe(host.shadowRoot, { childList: true, subtree: true });
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      observer?.disconnect();
    };
  }, [shouldLoadTypebot]);

  return (
    <section ref={sectionRef} className='site-main-typebot-chat' aria-label='Kipux chat'>
      <div className='bot-invite scroll-reveal'>
        <p className='bot-invite__eyebrow'>
          <span className='bot-live-dot' aria-hidden='true' />
          {content.bot.eyebrow}
        </p>
        <h2 className='bot-invite__title'>{content.bot.title}</h2>
        <p className='bot-invite__body'>{content.bot.body}</p>
        <ul className='bot-invite__badges' aria-label='Features'>
          {content.bot.badges.map((badge) => (
            <li key={badge} className='bot-badge'>
              <span className='bot-badge__check' aria-hidden='true'>✓</span>
              {badge}
            </li>
          ))}
        </ul>
        <p className='bot-invite__trust'>{content.bot.trust}</p>
      </div>
      <div className='site-main-typebot-chat__inner'>
        {shouldLoadTypebot
          ? createElement('typebot-standard', {
              className: 'site-main-typebot-chat__embed',
              style: { width: '100%', height: '600px' },
            })
          : (
            <button
              className='site-main-typebot-chat__placeholder'
              type='button'
              onClick={() => setShouldLoadTypebot(true)}
              aria-label='Open Kipux chat'
            >
              <span className='site-main-typebot-chat__placeholder-badge'>Kipux</span>
              <strong>Open live chat</strong>
              <span>Load the assistant only when you need it.</span>
            </button>
          )}
      </div>
    </section>
  );
}
