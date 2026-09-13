import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('C:\\Users\\T-800\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1942, height: 809 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL('C:\\Users\\T-800\\Documents\\ChatGPT\\kaleido\\byn-servicios-site\\design\\banner-texto-preview.html').href, { waitUntil: 'load' });
await page.screenshot({ path: 'C:\\Users\\T-800\\Documents\\ChatGPT\\kaleido\\byn-servicios-site\\design\\banner-texto-preview.png' });
await browser.close();
