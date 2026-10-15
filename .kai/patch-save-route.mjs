// Fix found during item 4 verification: the listing form always saved through
// the host-scoped /properties routes, which requireHostWorkspace excludes ADMIN
// from - so an admin saving from the control centre got a 403 and nothing
// persisted. Route by workspace instead.
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/pages/AdminPropertyForm.jsx';
const raw = readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let text = raw.split('\r\n').join('\n');

const oldText = `    try {
      if (isEdit) {
        await apiClient.put(\`/properties/\${id}\`, payload);
        navigate(\`\${base}/properties\`);
      } else {
        const res = await apiClient.post('/properties', payload);
        // Go to edit so seasonal pricing & calendar (which need an id) are available
        navigate(\`\${base}/properties/\${res.data.data.id}/edit\`);
      }`;

const newText = `    try {
      // /properties is host-scoped (requireHostWorkspace, which excludes ADMIN),
      // so an admin saving from the control centre must use /admin/properties or
      // the request is rejected with a 403 and nothing persists.
      const endpoint = base === '/admin' ? '/admin/properties' : '/properties';
      if (isEdit) {
        await apiClient.put(\`\${endpoint}/\${id}\`, payload);
        navigate(\`\${base}/properties\`);
      } else {
        const res = await apiClient.post(endpoint, payload);
        // Go to edit so seasonal pricing & calendar (which need an id) are available
        navigate(\`\${base}/properties/\${res.data.data.id}/edit\`);
      }`;

const count = text.split(oldText).length - 1;
if (count !== 1) {
  throw new Error(`expected 1 occurrence, found ${count}`);
}
text = text.split(oldText).join(newText);
writeFileSync(path, eol === '\r\n' ? text.split('\n').join('\r\n') : text, 'utf8');
console.log('patched ' + path);
