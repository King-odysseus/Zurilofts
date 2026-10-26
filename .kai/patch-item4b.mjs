// Follow-up to item 4, driven by an e2e failure: `address` rejected null, so a
// cleared pin left a stale label behind and an untouched null address was
// rewritten as an empty string. Make the label nullable and send it explicitly
// in each of the three cases.
import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, edits) {
  const raw = readFileSync(path, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let text = raw.split('\r\n').join('\n');

  for (const [oldText, newText, expected] of edits) {
    const count = text.split(oldText).length - 1;
    if (count !== expected) {
      throw new Error(`${path}: expected ${expected}, found ${count} for:\n${oldText.slice(0, 120)}`);
    }
    text = text.split(oldText).join(newText);
  }

  writeFileSync(path, eol === '\r\n' ? text.split('\n').join('\r\n') : text, 'utf8');
  console.log(`patched ${path} (${edits.length} edit(s))`);
}

patch('server/src/types/index.ts', [
  [
    '  address: z.string().max(300).optional(),',
    '  address: z.string().max(300).nullable().optional(),',
    1,
  ],
]);

patch('src/pages/AdminPropertyForm.jsx', [
  [
    `    // null means the author cleared a pin on an existing listing, so send it
    // explicitly to null out the stored coordinates. '' means no pin was ever
    // chosen, so omit the fields rather than writing empty strings.
    if (form.lat === null) {
      payload.lat = null;
      payload.lng = null;
    } else if (form.lat !== '') {
      payload.lat = Number(form.lat);
      payload.lng = Number(form.lng);
    }
    if (typeof form.address === 'string') payload.address = form.address;`,
    `    // Three distinct states, because the picker uses null and '' differently:
    // null = the author cleared a pin, '' = no pin was ever chosen.
    if (form.lat === null) {
      // Clearing the pin must clear the label too, or a stale street name would
      // outlive the coordinates it belonged to.
      payload.lat = null;
      payload.lng = null;
      payload.address = null;
    } else if (form.lat !== '') {
      payload.lat = Number(form.lat);
      payload.lng = Number(form.lng);
      if (form.address) payload.address = form.address;
    } else if (form.address) {
      // A label with no coordinates is still meaningful: the host-confirmed
      // street name that guests see.
      payload.address = form.address;
    }`,
    1,
  ],
]);

console.log('all edits applied');
