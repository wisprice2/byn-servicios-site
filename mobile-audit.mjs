import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\T-800\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright');
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
});

for (const width of [320, 375, 390, 430]) {
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return route.abort();
    return route.continue();
  });

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'commit' });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(250);

  const categories = {};
  for (const category of ['residencial', 'comercial', 'bienestar', 'accesorios']) {
    await page.click(`.catalog-tab[data-category="${category}"]`);
    const preview = await page.locator('.product-card:not([hidden])').count();
    const canExpand = await page.locator('#catalog-toggle').isVisible();
    if (canExpand) await page.click('#catalog-toggle');
    const total = await page.locator('.product-card:not([hidden])').count();
    categories[category] = { preview, total };
  }
  await page.click('.catalog-tab[data-category="residencial"]');

  await page.click('.menu-toggle');
  const menuOpened = await page.locator('#mobile-menu').isVisible();
  await page.keyboard.press('Escape');
  const menuClosed = await page.locator('#mobile-menu').isHidden();

  const audit = await page.evaluate(() => {
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const label = element => (element.textContent || element.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 55);
    const tinyText = [...document.querySelectorAll('p, small, strong, span, a, button, summary, figcaption')]
      .filter(visible)
      .map(element => ({ label: label(element), size: Number.parseFloat(getComputedStyle(element).fontSize) }))
      .filter(item => item.label && item.size < 11)
      .slice(0, 30);
    const smallTargets = [...document.querySelectorAll('a[href], button, summary')]
      .filter(visible)
      .map(element => {
        const rect = element.getBoundingClientRect();
        return { label: label(element), width: Math.round(rect.width), height: Math.round(rect.height) };
      })
      .filter(item => item.width < 44 || item.height < 44)
      .slice(0, 30);
    const sectionHeights = [...document.querySelectorAll('main > section')].map(section => ({
      className: section.className,
      height: Math.round(section.getBoundingClientRect().height)
    }));

    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      tinyText,
      smallTargets,
      sectionHeights
    };
  });

  console.log(JSON.stringify({ width, ...audit, categories, menu: { opened: menuOpened, closed: menuClosed }, errors }));
  await page.close();
}

await browser.close();
