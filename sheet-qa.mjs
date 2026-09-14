import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\T-800\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright');
const output = new URL('./design/qa/', import.meta.url);
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
});

for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.includes('fonts.googleapis.com')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (url.includes('fonts.gstatic.com')) return route.fulfill({ status: 204, body: '' });
    return route.continue();
  });
  await page.goto('http://127.0.0.1:4174/#equipos', { waitUntil: 'domcontentloaded' });
  await page.click('#catalog-toggle');
  const card = page.locator('.product-card[data-category="residencial"]').nth(3);
  await card.scrollIntoViewIfNeeded();
  await card.locator('summary').click();
  await card.screenshot({ path: fileURLToPath(new URL(`${name}-technical-sheets.png`, output)) });
  await page.close();
}

await browser.close();
