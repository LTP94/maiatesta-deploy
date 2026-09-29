import { createApp } from './app.js';
import { getPort } from './config/env.js';

const port = getPort();
createApp().listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`maiatesta-whatsapp-backend listening on :${port}`);
});
