import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import prisma from './config/prisma.js';
import { env } from './config/env.js';
import { syncAll } from './services/ical.service.js';
import { runDueAutoMessages } from './services/automated-message.service.js';
import { syncConfiguredAdmin } from './services/admin-bootstrap.service.js';
import { processScheduledPayouts, reconcilePendingPayouts, releaseDueHostFunds } from './services/payout.service.js';
import { sendHostApplicationNudges } from './services/nudge.service.js';
import { pruneExpiredRefreshSessions } from './services/auth.service.js';
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
      if (meta.status === 503) {
        // The page exists but we could not read it, so a short Retry-After asks
        // crawlers to come back instead of dropping the listing for good.
        res.set('Retry-After', '300');
      }
      if (meta.status !== 200) res.status(meta.status);
      res.type('html').send(injectMeta(shellHtml, meta));
    } catch (err) {
      console.error('Per-page metadata failed, serving the plain shell:', err);
      res.sendFile(indexHtmlPath);
    }
  });
  console.log(` Serving static files from ${clientDist}`);
}

let server: ReturnType<typeof app.listen> | null = null;

/** Stops every sweep. Filled in as the boot callback starts them. */
const stoppers: Array<() => void> = [];

/**
 * Run a sweep on a first delay and then every interval, keeping the handles so
 * shutdown can stop them. A round left running while the database closes is how
 * a redeploy turns into a burst of errors that nobody reads.
 */
function schedule(run: () => void, firstDelayMs: number, intervalMs: number): void {
  let interval: NodeJS.Timeout | null = null;
  const first = setTimeout(() => {
    run();
    interval = setInterval(run, intervalMs);
  }, firstDelayMs);
  stoppers.push(() => {
    clearTimeout(first);
    if (interval) clearInterval(interval);
  });
}

/**
 * Connect before listening. A bad DATABASE_URL used to boot cleanly, pass its
 * health check and answer its first real request with a 500, so a broken deploy
 * stayed in rotation instead of failing where someone would see it.
 */
async function start(): Promise<void> {
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('Cannot reach the database at boot:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  server = app.listen(Number(env.PORT), () => {
    console.log(` ZuriLofts running on port ${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Health: http://localhost:${env.PORT}/api/health`);
    syncConfiguredAdmin().catch((err) => console.error('Admin account sync failed:', err?.message || err));
    startCalendarSync();
    startAutomatedMessageScheduler();
    startPayoutScheduler();
    startHostNudgeScheduler();
    startSessionSweep();
  });
}

void start();

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

let shuttingDown = false;

/**
 * Railway sends SIGTERM on a redeploy and the process used to die where it stood:
 * in-flight responses were cut, and work already handed to Paystack
 * carried on with nothing watching it.
 */
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(` ${signal} received - finishing in-flight requests before exit`);

  // Sweeps first: a payout round must not start another while the database closes.
  for (const stop of stoppers.splice(0)) stop();

  const closed = new Promise<void>((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });

  // A hung connection must not hold the deploy open past the platform's own grace
  // period; exiting here leaves a clear line instead of an unexplained kill.
  const deadline = setTimeout(() => {
    console.error(' Shutdown timed out - exiting with requests still open');
    process.exit(1);
  }, 15_000);
  deadline.unref();

  await closed;
  await prisma.$disconnect().catch((err: unknown) => {
    console.error('Database disconnect failed during shutdown:', err instanceof Error ? err.message : err);
  });
  clearTimeout(deadline);
  console.log(' Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Periodically import external iCal feeds so blocked dates stay current without
// manual syncing. Failures per-source are swallowed inside syncAll.
function startCalendarSync() {
  // Hourly rather than every three hours: each round halves the window in which
  // a night sold elsewhere still looks free here. A booking also pulls its own
  // property's feeds first (refreshPropertyFeeds), so this round is the floor,
  // not the only protection.
  const INTERVAL_MS = 60 * 60 * 1000;
  const run = () => {
    syncAll()
      .then((count) => {
        if (count > 0) console.log(` Calendar sync ran for ${count} source(s)`);
      })
      .catch((err) => console.error('Calendar sync failed:', err?.message || err));
  };
  // First run shortly after boot, then on the interval
  schedule(run, 30 * 1000, INTERVAL_MS);
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
            if (failed.length > 0) {
              // One line for the run. A systemic refusal (no provider balance,
              // provider down) skips every host with the same reason, and the
              // per-host line repeated it once each, every hour, until nobody read it.
              const reasons = [...new Set(failed.map((f) => String(f.reason).slice(0, 120)))].slice(0, 3);
              console.warn(`Payouts skipped for ${failed.length} host(s): ${reasons.join('; ')}`);
            }
          })
          // A payout whose transfer reply was lost is left PENDING with the money
          // held. Nothing else ever asks the provider what became of it, so
          // without this the host's earnings would sit there for good.
          .then(() => reconcilePendingPayouts())
          .then(({ checked, settled }) => {
            if (settled > 0) console.log(` Reconciled ${settled} of ${checked} payout(s) with an unknown outcome`);
          });
      })
      .catch((err) => console.error('Scheduled payout run failed:', err?.message || err));
  };
  // Give the app time to finish booting before the first sweep.
  schedule(run, 2 * 60 * 1000, INTERVAL_MS);
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
  schedule(run, 10 * 60 * 1000, INTERVAL_MS);
}

// Periodically deliver time-based automated host messages (pre-arrival
// reminders, check-in/check-out day messages, post-stay review nudges). Runs
// every 15 minutes; per-booking dedupe logs make overlapping runs a no-op.
function startAutomatedMessageScheduler() {
  const INTERVAL_MS = 15 * 60 * 1000;
  const run = () => {
    runDueAutoMessages()
      .then(({ sent, failed, stoppedEarly }) => {
        if (sent > 0) console.log(` Automated messages sent for ${sent} booking(s)`);
        if (failed > 0) {
          console.warn(
            `Automated messages failed for ${failed} send(s)` +
              (stoppedEarly ? ' - run stopped early, the failure looks systemic' : '')
          );
        }
      })
      .catch((err) => console.error('Automated message scan failed:', err?.message || err));
  };
  schedule(run, 45 * 1000, INTERVAL_MS);
}


// A refresh session row carries the address and browser it was created from.
// Rows are removed when used again or logged out, so the only ones that survive
// are abandoned devices that will never come back. Sweeping them is what stops
// that history growing without limit; hourly is far more often than needed, but
// the query is a single indexed delete.
function startSessionSweep() {
  const INTERVAL_MS = 60 * 60 * 1000;
  const run = () => {
    pruneExpiredRefreshSessions()
      .then((removed) => {
        if (removed > 0) console.log(` Removed ${removed} expired session record(s)`);
      })
      .catch((err) => console.error('Session sweep failed:', err?.message || err));
  };
  schedule(run, 5 * 60 * 1000, INTERVAL_MS);
}
