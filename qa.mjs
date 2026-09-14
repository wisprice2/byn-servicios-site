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

const cases = [
  ['desktop', { width: 1440, height: 1000 }],
  ['wide', { width: 1920, height: 1080 }],
  ['tablet', { width: 768, height: 1024 }],
  ['mobile', { width: 390, height: 844 }]
];
const requestedCase = process.argv[2];

for (const [name, viewport] of cases.filter(([caseName]) => !requestedCase || caseName === requestedCase)) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('http://127.0.0.1:4174/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const images = [...document.images];
    images.forEach(image => { image.loading = 'eager'; });
    for (let y = 0; y < document.documentElement.scrollHeight; y += 650) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    await Promise.all(images.map(image => image.decode?.().catch(() => {})));
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(200);

  const categories = {};
  for (const tab of ['residencial', 'comercial', 'bienestar', 'accesorios']) {
    await page.click(`[data-category="${tab}"][role="tab"]`);
    categories[tab] = await page.locator('.product-card:not([hidden])').count();
  }
  await page.click('[data-category="residencial"][role="tab"]');

  const serviceCategories = {};
  for (const category of ['clima', 'solar', 'electricidad', 'bombas']) {
    await page.click(`[data-service-category="${category}"]`);
    serviceCategories[category] = {
      visiblePanels: await page.locator('.service-panel:not([hidden])').count(),
      cards: await page.locator('.service-panel:not([hidden]) .service-card').count()
    };
  }
  await page.click('[data-service-category="clima"]');

  await page.locator('#btu-area').evaluate(input => {
    input.value = '36';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const btuGuide = await page.evaluate(() => ({
    area: document.getElementById('btu-area-value')?.textContent,
    capacity: document.getElementById('btu-capacity')?.textContent,
    coverage: document.getElementById('btu-coverage')?.textContent,
    whatsapp: document.getElementById('btu-whatsapp')?.getAttribute('href'),
    priorityProducts: [...document.querySelectorAll('.is-priority-brand h3')].map(element => element.textContent)
  }));
  await page.locator('#btu-area').evaluate(input => {
    input.value = '20';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  if (name === 'mobile') {
    await page.click('.menu-toggle');
    const opened = await page.locator('#mobile-menu').isVisible();
    await page.keyboard.press('Escape');
    const closed = await page.locator('#mobile-menu').isHidden();
    categories.mobileMenu = { opened, closed };
  }

  const audit = await page.evaluate(() => {
    const heroVideo = document.querySelector('.hero-media video');
    const heroRect = heroVideo?.getBoundingClientRect();
    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.getAttribute('src')),
      missingAlt: [...document.images].filter(image => !image.hasAttribute('alt')).map(image => image.getAttribute('src')),
      activeTab: document.querySelector('[role="tab"][aria-selected="true"]')?.dataset.category,
      visibleProducts: document.querySelectorAll('.product-card:not([hidden])').length,
      heroVideo: heroVideo ? {
        readyState: heroVideo.readyState,
        paused: heroVideo.paused,
        muted: heroVideo.muted,
        loop: heroVideo.loop,
        intrinsic: `${heroVideo.videoWidth}x${heroVideo.videoHeight}`,
        rendered: `${Math.round(heroRect.width)}x${Math.round(heroRect.height)}`,
        objectFit: getComputedStyle(heroVideo).objectFit,
        objectPosition: getComputedStyle(heroVideo).objectPosition
      } : null
    };
  });

  console.log(JSON.stringify({ name, ...audit, categories, serviceCategories, btuGuide, errors }));
  await page.screenshot({
    path: fileURLToPath(new URL(`${name}.png`, output)),
    fullPage: true
  });
  await page.close();
}

await browser.close();
