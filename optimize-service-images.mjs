import { createRequire } from 'node:module';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('C:\\Users\\T-800\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\sharp');
const assets = join(process.cwd(), 'dist', 'assets');
const sources = (await readdir(assets)).filter(name => /^servicio-.*\.png$/i.test(name));


for (const source of sources) {
  await sharp(join(assets, source))
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 82, smartSubsample: true })
    .toFile(join(assets, source.replace(/\.png$/i, '.webp')));
}

console.log(`Optimized ${sources.length} service images.`);
