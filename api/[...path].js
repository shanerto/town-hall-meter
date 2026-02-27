// Vercel serverless catch-all: routes every /api/* request to the Express app.
// Vercel's Node.js runtime treats a default-exported function/app as an HTTP handler.
import app from '../backend/server.js';

export default app;
