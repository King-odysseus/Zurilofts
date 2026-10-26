// One-off patch runner: remove the dead SERVICE_FEE_PERCENT knob.
// The guest fee is hardcoded at 12% in utils/pricing.ts and covered by
// tests/pricing.test.ts, so this value was never read - it only implied a rate
// the app does not charge. Deleted rather than wired up, which would silently
// cut the fee from 12% to 7.5%.
import { readFileSync, writeFileSync } from 'node:fs';

function dropLines(path, lines) {
  const raw = readFileSync(path, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let text = raw.split('\r\n').join('\n');

  for (const line of lines) {
    const anchor = `${line}\n`;
    const count = text.split(anchor).length - 1;
    if (count !== 1) {
      throw new Error(`${path}: expected 1 occurrence of "${line}", found ${count}`);
    }
    text = text.split(anchor).join('');
  }

  writeFileSync(path, eol === '\r\n' ? text.split('\n').join('\r\n') : text, 'utf8');
  console.log(`cleaned ${path} (${lines.length} line(s) removed)`);
}

// The "// Platform fees" comment stays: WITHHOLDING_TAX_RATE and
// TRANSFER_FEE_PASS_TO_HOST below it are still live.
dropLines('server/src/config/env.ts', ["  SERVICE_FEE_PERCENT: z.string().default('7.5'),"]);
dropLines('server/src/services/payment.service.ts', [
  'const SERVICE_FEE_PERCENT = Number(env.SERVICE_FEE_PERCENT) / 100;',
]);
dropLines('server/.env', ['SERVICE_FEE_PERCENT="7.5"']);
dropLines('server/.env.example', ['SERVICE_FEE_PERCENT="7.5"']);
dropLines('.github/workflows/ci.yml', ['      SERVICE_FEE_PERCENT: "7.5"']);

console.log('all fee-knob lines removed');
