// Removes the duplicate nudge scheduler: the project already has nudge.service.ts
// wired here, and two schedulers would send every reminder twice.
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'server/src/index.ts');
let text = fs.readFileSync(file, 'utf8');
const before = text.length;

const lines = [
  "import { runHostSignupNudges } from './services/host-nudge.service.js';",
].map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

for (const pattern of lines) {
  text = text.replace(new RegExp(`^\\s*${pattern}\\r?\\n`, 'm'), '');
}

// Drop the second definition block, from its leading comment to its closing brace.
const duplicateStart = text.indexOf('// Periodically remind a host who started a host application and stopped.');
if (duplicateStart !== -1) {
  const endMarker = 'setInterval(run, INTERVAL_MS);\r\n}\r\n';
  const endIdx = text.indexOf(endMarker, duplicateStart);
  if (endIdx === -1) throw new Error('could not find the end of the duplicate scheduler');
  text = text.slice(0, duplicateStart) + text.slice(endIdx + endMarker.length);
}

// Restore the comment that belongs to the automated-message scheduler, which the
// duplicate was inserted in front of.
text = text.replace(
  /\/\/ Periodically deliver time-based automated host messages[\s\S]*?\/\/ Remind a host whose application has been sitting untouched\.[\s\S]*?rows\.\r?\n/,
  (match) => match.slice(0, match.indexOf('// Remind a host')),
);

fs.writeFileSync(file, text);
console.log(`index.ts rewritten (${before} -> ${text.length} chars)`);
