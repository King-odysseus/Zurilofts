// Throwaway helper: serve the KAI attachments folder over localhost so the
// browser tool (which refuses file:// URLs) can render an attached image.
// Deleted at the end of the task; never part of the app.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

const ROOT = 'C:/Users/Mega-Mind/AppData/Roaming/KAI/attachments';
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

createServer(async (req, res) => {
  const name = basename(decodeURIComponent(req.url.split('?')[0]));
  try {
    const buf = await readFile(join(ROOT, name));
    res.writeHead(200, { 'Content-Type': TYPES[extname(name).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(4599, '127.0.0.1', () => console.log('img server on http://127.0.0.1:4599'));
