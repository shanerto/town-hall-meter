import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import townhallsRouter from './routes/townhalls.js';
import votesRouter from './routes/votes.js';
import adminRouter from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const app = express();

// Allow same-origin requests and any explicitly listed frontend origins.
// Set ALLOWED_ORIGINS to a comma-separated list, e.g.:
//   ALLOWED_ORIGINS=https://town-hall-meter.vercel.app,https://mycompany.com
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : null;

app.use(
  cors({
    origin: allowedOrigins
      ? (origin, cb) => {
          // allow server-to-server requests (no origin) and listed origins
          if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
          cb(new Error(`CORS: origin ${origin} not allowed`));
        }
      : '*',
    credentials: true,
  })
);
app.use(express.json());

// API routes
app.use('/api/townhalls', townhallsRouter);
app.use('/api/votes', votesRouter);
app.use('/api/admin', adminRouter);

// Serve frontend in production
const distPath = join(__dirname, '..', 'frontend', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Town Hall Meter server running on port ${PORT}`);
  console.log(`Admin token: ${process.env.ADMIN_TOKEN || 'admin123 (default — set ADMIN_TOKEN env var)'}`);
});
