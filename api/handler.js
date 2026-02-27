// Vercel serverless entry-point for all /api/* requests.
// Vercel's Node.js runtime calls the default export as an HTTP handler.
import app from '../backend/server.js';

export default app;
