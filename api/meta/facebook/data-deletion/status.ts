import { verifyStatusToken } from '../../../../server/meta/facebook/data-deletion-status-token';
import { getDataDeletionStatusKey, MetaConfigError } from '../../../../server/meta/config';

const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
};

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...SECURITY_HEADERS,
    },
  });
}

function errorPage(): Response {
  return htmlResponse(
    '<!doctype html><html lang="es"><meta charset="utf-8"><title>Solicitud no válida</title><body><p>El enlace de estado no es válido o ha expirado.</p></body></html>',
    400,
  );
}

// Only GET is exported — Vercel auto-405s everything else.
export async function GET(request: Request) {
  let statusKey: Buffer;
  try {
    statusKey = getDataDeletionStatusKey();
  } catch (error) {
    if (error instanceof MetaConfigError) {
      return htmlResponse(
        '<!doctype html><html lang="es"><meta charset="utf-8"><title>Error</title><body><p>No se pudo procesar la solicitud.</p></body></html>',
        500,
      );
    }
    throw error;
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return errorPage();
  }

  const payload = verifyStatusToken(token, statusKey);

  if (!payload) {
    return errorPage();
  }

  const statusLabel = payload.status === 'completed' ? 'Completada' : payload.status;

  const html = `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<title>Solicitud de eliminación de datos</title>
<body>
<h1>Solicitud de eliminación de datos</h1>
<p>Estado: ${statusLabel}</p>
<p>Código de confirmación: ${payload.confirmationCode}</p>
<p>Consulta nuestras instrucciones de eliminación de datos: <a href="/eliminacion-de-datos/">https://www.maiatesta.com/eliminacion-de-datos/</a></p>
</body>
</html>`;

  return htmlResponse(html, 200);
}
