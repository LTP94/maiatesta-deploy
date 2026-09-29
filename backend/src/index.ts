import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { getAllowedOrigins, getPort } from './config/env.js';
import { healthRouter } from './routes/health.js';

const app = express();

app.use(
  pinoHttp({
    // Nunca loguear headers de autorización ni bodies completos (pueden
    // contener signed_request/códigos) — solo metadata de la request.
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  }),
);

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: false,
  }),
);

app.use(express.json({ limit: '256kb' }));

app.use(healthRouter);

const port = getPort();
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`maiatesta-whatsapp-backend listening on :${port}`);
});
