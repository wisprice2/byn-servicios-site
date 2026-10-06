import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdtemp, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { createReviewsHandler } from '../lib/reviews.mjs';
import { createLocalReviewStore } from '../lib/local-review-store.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/T-800/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const directory = await mkdtemp(join(tmpdir(), 'byn-reviews-browser-'));
const handler = createReviewsHandler({ store: createLocalReviewStore(directory), rateSecret: 'test-only' });
const root = join(process.cwd(), 'dist');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const server = createServer(async (req, res) => {
  if (new URL(req.url, 'http://localhost').pathname === '/api/reviews') return handler(req, res);
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    const file = join(root, path === '/' ? 'index.html' : path);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/#resenas`;
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
await mkdir('design/qa', { recursive: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  desktop.on('pageerror', error => errors.push(error.message));
  await desktop.goto(url);
  await desktop.locator('.review-empty').waitFor();
  await desktop.locator('#resenas').screenshot({ path: 'design/qa/reviews-empty.png' });
  await desktop.locator('#review-name').fill('Prueba local');
  await desktop.locator('#review-location').fill('Talca');
  const message = 'Prueba aislada de guardado. <img src=x onerror=alert(1)> No es una reseña de cliente.';
  await desktop.locator('#review-message').fill(message);
  await desktop.locator('#review-consent').check();
  let popups = 0;
  desktop.on('popup', () => popups++);
  await desktop.getByRole('button', { name: 'Publicar reseña' }).click();
  await desktop.locator('#review-form-status[data-state="success"]').waitFor();
  assert.equal(await desktop.locator('.review-card > p').innerText(), message);
  assert.equal(await desktop.locator('.review-card img').count(), 0);
  assert.equal(popups, 0);
  await desktop.reload();
  await desktop.locator('.review-card').waitFor();
  assert.equal(await desktop.locator('.review-card > p').innerText(), message);
  await desktop.locator('#resenas').screenshot({ path: 'design/qa/reviews-desktop.png' });
  for (const width of [320, 390, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(url);
    await page.locator('.review-card').waitFor();
    assert.equal(await page.locator('.review-card > p').innerText(), message);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `Overflow at ${width}px`);
    await page.locator('#resenas').screenshot({ path: `design/qa/reviews-${width}.png` });
    if (width === 390) {
      await page.route('**/api/reviews', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Prueba de conexión fallida.' }) }));
      await page.locator('#review-message').fill('Este texto debe conservarse si el guardado falla.');
      await page.locator('#review-consent').check();
      await page.getByRole('button', { name: 'Publicar reseña' }).click();
      await page.locator('#review-form-status[data-state="error"]').waitFor();
      assert.equal(await page.locator('#review-message').inputValue(), 'Este texto debe conservarse si el guardado falla.');
      assert.equal(await page.getByRole('button', { name: 'Publicar reseña' }).isEnabled(), true);
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: form submission, no WhatsApp, persistent reload and new visitors, safe text rendering, 320/390/768/1440 layouts, error recovery.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
