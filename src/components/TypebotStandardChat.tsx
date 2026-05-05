import { createElement, useEffect } from 'react';

const typebotScriptId = 'maiatesta-typebot-standard-script';

export function TypebotStandardChat() {
  useEffect(() => {
    if (document.getElementById(typebotScriptId)) {
      return;
    }

    const typebotInitScript = document.createElement('script');
    typebotInitScript.id = typebotScriptId;
    typebotInitScript.type = 'module';
    typebotInitScript.innerHTML = `import Typebot from 'https://cdn.jsdelivr.net/npm/@typebot.io/js@0/dist/web.js'
  
Typebot.initStandard({
  typebot: "my-typebot-fy5w3to",
  apiHost: "https://viewer.kipuxbot.com",
});
`;
    document.body.append(typebotInitScript);
  }, []);

  return (
    <div className='site-main-typebot-chat'>
      {createElement('typebot-standard', {
        style: { width: '100%', height: '600px' },
      })}
    </div>
  );
}
