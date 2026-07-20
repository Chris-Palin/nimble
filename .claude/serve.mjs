// tiny static server for local preview of the nimble site
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../public', import.meta.url).pathname;
const MIME = {
  '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.ttf':'font/ttf',
  '.webp':'image/webp', '.jpg':'image/jpeg', '.json':'application/json',
};
createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(root, p));
    if (!file.startsWith(root)) throw new Error('nope');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(8613, () => console.log('serving on http://localhost:8613'));
