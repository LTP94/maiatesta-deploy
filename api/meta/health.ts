export function GET() {
  return Response.json(
    {
      ok: true,
      service: 'maiatesta-meta-backend',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
