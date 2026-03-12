// Vercel Edge Middleware — runs before static file serving and serverless functions.
// Intercepts all non-API requests and returns a maintenance page when
// MAINTENANCE_MODE=true, without requiring a redeployment.

const maintenanceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rate Town Hall</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9fafb;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #111827;
    }
    p {
      font-size: 1.125rem;
      font-weight: 500;
      text-align: center;
      padding: 0 1.5rem;
    }
  </style>
</head>
<body>
  <p>Rate Town Hall is temporarily offline.</p>
</body>
</html>`;

export default function middleware(request) {
  if (process.env.MAINTENANCE_MODE !== 'true') return;

  const { pathname } = new URL(request.url);
  if (pathname.startsWith('/api/')) return;

  return new Response(maintenanceHtml, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  matcher: '/(.*)',
};
