import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createReviewsHandler } from './lib/reviews.mjs';
import { createLocalReviewStore } from './lib/local-review-store.mjs';

const root = join(process.cwd(), 'dist');
const port = Number(process.argv[2] || 4174);
const reviewsHandler = createReviewsHandler({
  store: createLocalReviewStore(join(process.cwd(), '.local-data', 'reviews')),
  rateSecret: 'local-development-only'
});
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf'
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  if (pathname === '/api/reviews') {
    await reviewsHandler(request, response);
    return;
  }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = normalize(join(root, relative));

  if (!file.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, 'index.html') : file;
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Local: http://127.0.0.1:${port}`);
});
