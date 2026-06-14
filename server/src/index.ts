import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { env } from './config/env.js';
import { startTelegramPoller } from './services/chat.service.js';
import { syncAll } from './services/ical.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production, serve the built frontend
if (env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`📦 Serving static files from ${clientDist}`);
}

app.listen(Number(env.PORT), () => {
  console.log(`🚀 ZuriLofts running on port ${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Health: http://localhost:${env.PORT}/api/health`);
  startTelegramPoller();
  startCalendarSync();
});

// Periodically import external iCal feeds (every 3 hours) so blocked dates stay
// current without manual syncing. Failures per-source are swallowed inside syncAll.
function startCalendarSync() {
  const INTERVAL_MS = 3 * 60 * 60 * 1000;
  const run = () => {
    syncAll()
      .then((count) => {
        if (count > 0) console.log(`📅 Calendar sync ran for ${count} source(s)`);
      })
      .catch((err) => console.error('Calendar sync failed:', err?.message || err));
  };
  // First run shortly after boot, then on the interval
  setTimeout(run, 30 * 1000);
  setInterval(run, INTERVAL_MS);
}
