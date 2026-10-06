import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

// Development only. Never use a function's temporary filesystem for production reviews.
export function createLocalReviewStore(directory) {
  return {
    async insert(key, review) {
      await mkdir(directory, { recursive: true });
      const path = join(directory, basename(key));
      try { await writeFile(path, JSON.stringify(review), { flag: 'wx' }); return null; }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        return JSON.parse(await readFile(path, 'utf8'));
      }
    },
    async list(cursor) {
      await mkdir(directory, { recursive: true });
      const files = (await readdir(directory)).filter(name => /^\d{13}-[a-f0-9]{32}\.json$/.test(name)).sort();
      const remaining = cursor ? files.filter(name => name > cursor) : files;
      const page = remaining.slice(0, 6);
      const reviews = await Promise.all(page.map(async name => JSON.parse(await readFile(join(directory, name), 'utf8'))));
      reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { reviews, cursor: remaining.length > 6 ? page.at(-1) : null };
    }
  };
}
