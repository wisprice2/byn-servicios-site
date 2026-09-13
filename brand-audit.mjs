import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\T-800\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
await mkdir(new URL('./design/qa/', import.meta.url), { recursive: true });

for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return route.abort();
    return route.continue();
  });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.locator('.hero').screenshot({ path: fileURLToPath(new URL(`./design/qa/hero-${name}.png`, import.meta.url)) });
  const panel = page.locator('.brand-panel');
  await panel.scrollIntoViewIfNeeded();
  const before = await page.locator('.brand-track').evaluate(element => getComputedStyle(element).transform);
  await page.waitForTimeout(1400);
  const after = await page.locator('.brand-track').evaluate(element => getComputedStyle(element).transform);
  await panel.screenshot({ path: fileURLToPath(new URL(`./design/qa/brands-${name}.png`, import.meta.url)) });
  const maintenance = page.locator('.maintenance-section');
  await maintenance.scrollIntoViewIfNeeded();
  const maintenanceBefore = await page.locator('.maintenance-track').evaluate(element => getComputedStyle(element).transform);
  await page.waitForTimeout(1200);
  const maintenanceAfter = await page.locator('.maintenance-track').evaluate(element => getComputedStyle(element).transform);
  await maintenance.screenshot({ path: fileURLToPath(new URL(`./design/qa/maintenance-${name}.png`, import.meta.url)) });
  if (name === 'desktop') {
    const electrical = page.locator('.electrical-project');
    await electrical.scrollIntoViewIfNeeded();
    await electrical.screenshot({ path: fileURLToPath(new URL('./design/qa/electrical-desktop.png', import.meta.url)) });
  }
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    groups: document.querySelectorAll('.brand-grid').length,
    duration: getComputedStyle(document.querySelector('.brand-track')).animationDuration,
    animationName: getComputedStyle(document.querySelector('.brand-track')).animationName
  }));
  console.log(JSON.stringify({ name, before, after, moving: before !== after, maintenanceBefore, maintenanceAfter, maintenanceMoving: maintenanceBefore !== maintenanceAfter, ...metrics }));
  await page.close();
}

await browser.close();
