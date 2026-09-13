import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\T-800\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright');
const output = new URL('./design/qa/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route('**/*', route => {
  const url = route.request().url();
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return route.abort();
  return route.continue();
});
await page.goto('http://127.0.0.1:4174/', { waitUntil: 'commit' });
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(400);
for (const selector of ['.hero', '.services', '.solutions', '.equipment', '.coverage-card', '.electrical-project', '.process']) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
  await page.locator(selector).screenshot({
    path: fileURLToPath(new URL(`mobile-${selector.slice(1)}.png`, output))
  });
}
for (const category of ['clima', 'solar', 'electricidad', 'bombas']) {
  await page.locator(`[data-service-category="${category}"]`).click();
  await page.waitForTimeout(250);
  await page.locator('.services').screenshot({
    path: fileURLToPath(new URL(`mobile-services-${category}.png`, output))
  });
}
await browser.close();
