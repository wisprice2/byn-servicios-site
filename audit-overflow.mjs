import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\T-800\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(300);
const result = await page.evaluate(() => ({
  viewport: document.documentElement.clientWidth,
  documentWidth: document.documentElement.scrollWidth,
  activeElement: document.activeElement?.outerHTML?.slice(0, 120),
  skipLink: (() => {
    const link = document.querySelector('.skip-link');
    const style = getComputedStyle(link);
    const rect = link.getBoundingClientRect();
    return { transform: style.transform, top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
  })(),
  offenders: [...document.querySelectorAll('body *')].map(element => {
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName,
      className: String(element.className).slice(0, 100),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    };
  }).filter(item => item.right > 391 || item.left < -1).slice(0, 40)
}));
console.log(JSON.stringify(result, null, 2));
await browser.close();
