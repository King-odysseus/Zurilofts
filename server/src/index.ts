import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { env } from './config/env.js';
import { startTelegramPoller } from './services/chat.service.js';

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
});
