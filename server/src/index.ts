import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { env } from './config/env.js';
import { startTelegramPoller } from './services/chat.service.js';
import { syncAll } from './services/ical.service.js';
import { runDueAutoMessages } from './services/automated-message.service.js';
import { syncConfiguredAdmin } from './services/admin-bootstrap.service.js';
import { processScheduledPayouts, releaseDueHostFunds } from './services/payout.service.js';
import { sendHostApplicationNudges } from './services/nudge.service.js';
import { injectMeta, isAppOnlyPath, legacyRedirect, metaForPath } from './services/seo.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production, serve the built frontend
if (env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../dist');
  const indexHtmlPath = path.join(clientDist, 'index.html');

  // The shell is read once at boot: it never changes while the process runs,
  // and every page view rewrites its head with that page's own tags.
  let shellHtml: string | null = null;
  try {
    shellHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  } catch (err) {
    console.warn(`Could not read ${indexHtmlPath}: serving the app without per-page metadata.`);
  }

  // index:false keeps "/" out of the static handler so the home page gets
  // its own head tags like every other route.
  app.use(express.static(clientDist, { index: false }));
  // Older listing addresses answer with a permanent redirect before anything
  // else looks at the path, so a crawler never sees them as live pages.
  app.get('*', (req, res, next) => {
    const target = legacyRedirect(req.path);
    if (!target) {
      next();
      return;
    }
    // The query string is carried over: the browse page reads its filters from
    // it and a stay page reads ?review=true.
    const query = req.originalUrl.slice(req.path.length);
    res.redirect(301, `${target}${query}`);
  });

  app.get('*', async (req, res) => {
    // Metadata is resolved per path so search engines and link previews, which
    // do not run JavaScript, get the right title, description and share image.
    try {
      const meta = shellHtml ? await metaForPath(req.path, req) : null;
      if (!meta || !shellHtml) {
        // An address that metaForPath does not recognise and the browser does not
        // own is a real not-found. Serving it as 200 with the home page's head
        // made every typo, dead share link and retired listing an indexable
        // duplicate of the home page. Signed-in screens still keep the shell.
        res.status(!shellHtml || isAppOnlyPath(req.path) ? 200 : 404).sendFile(indexHtmlPath);
        return;
      }
      if (meta.status === 404) res.status(404);
      res.type('html').send(injectMeta(shellHtml, meta));
    } catch (err) {
      console.error('Per-page metadata failed, serving the plain shell:', err);
      res.sendFile(indexHtmlPath);
    }
  });
  console.log(` Serving static files from ${clientDist}`);
}

app.listen(Number(env.PORT), () => {
  console.log(` ZuriLofts running on port ${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Health: http://localhost:${env.PORT}/api/health`);
  syncConfiguredAdmin().catch((err) => console.error('Admin account sync failed:', err?.message || err));
  startTelegramPoller();
  startCalendarSync();
  startAutomatedMessageScheduler();
  startPayoutScheduler();
  startHostNudgeScheduler();
});

// Unhandled promise rejections and process errors crash hard so Railway can
// restart and healthchecks surface the failure instead of a half-alive box.
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

// Periodically import external iCal feeds (every 3 hours) so blocked dates stay
// current without manual syncing. Failures per-source are swallowed inside syncAll.
function startCalendarSync() {
  const INTERVAL_MS = 3 * 60 * 60 * 1000;
  const run = () => {
    syncAll()
      .then((count) => {
        if (count > 0) console.log(` Calendar sync ran for ${count} source(s)`);
      })
      .catch((err) => console.error('Calendar sync failed:', err?.message || err));
  };
  // First run shortly after boot, then on the interval
  setTimeout(run, 30 * 1000);
  setInterval(run, INTERVAL_MS);
}

// Periodically release host money whose hold has expired and send the payouts
// that have come due. Without this the only way money reaches a host is an
// admin remembering to press the button, so a host on a weekly schedule could
// wait indefinitely.
//
// The release half runs even when Paystack is not configured: it only moves
// numbers inside the database, and a host's balance should tell the truth
// whether or not transfers are switched on yet.
function startPayoutScheduler() {
  if (!env.PAYSTACK_SECRET_KEY) {
    console.warn(' Paystack is not configured - scheduled host transfers are disabled; held earnings still release on schedule.');
  }
  const INTERVAL_MS = 60 * 60 * 1000;
  const run = () => {
    releaseDueHostFunds()
      .then(({ released, amount }) => {
        if (released > 0) console.log(` Released KES ${amount.toLocaleString()} to ${released} host booking(s)`);
      })
      .catch((err) => console.error('Host funds release failed:', err?.message || err))
      .then(() => {
        if (!env.PAYSTACK_SECRET_KEY) return undefined;
        return processScheduledPayouts()
          .then(({ processed, failed }) => {
            if (processed.length) console.log(` Payouts sent for ${processed.length} host(s)`);
            for (const f of failed) console.warn(`Payout skipped for host ${f.hostId}: ${f.reason}`);
          });
      })
      .catch((err) => console.error('Scheduled payout run failed:', err?.message || err));
  };
  // Give the app time to finish booting before the first sweep.
  setTimeout(run, 2 * 60 * 1000);
  setInterval(run, INTERVAL_MS);
}

// Remind a host whose application has been sitting untouched. Runs twice a
// day rather than hourly: the idle window is measured in days, so a faster
// sweep would only re-read the same rows.
function startHostNudgeScheduler() {
  const INTERVAL_MS = 12 * 60 * 60 * 1000;
  const run = () => {
    sendHostApplicationNudges()
      .then(({ sent }) => {
        if (sent > 0) console.log(` Sent ${sent} host application nudge(s)`);
      })
      .catch((err) => console.error('Host nudge scan failed:', err?.message || err));
  };
  // Slow first run: boot is the busiest moment and no nudge is urgent.
  setTimeout(run, 10 * 60 * 1000);
  setInterval(run, INTERVAL_MS);
}

// Periodically deliver time-based automated host messages (pre-arrival
// reminders, check-in/check-out day messages, post-stay review nudges). Runs
// every 15 minutes; per-booking dedupe logs make overlapping runs a no-op.
function startAutomatedMessageScheduler() {
  const INTERVAL_MS = 15 * 60 * 1000;
  const run = () => {
    runDueAutoMessages()
      .then(({ sent }) => {
        if (sent > 0) console.log(` Automated messages sent for ${sent} booking(s)`);
      })
      .catch((err) => console.error('Automated message scan failed:', err?.message || err));
  };
  setTimeout(run, 45 * 1000);
  setInterval(run, INTERVAL_MS);
}

