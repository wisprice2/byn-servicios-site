import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createReviewsHandler, validateReview } from '../lib/reviews.mjs';
import { createLocalReviewStore } from '../lib/local-review-store.mjs';
import { createBlobReviewStore } from '../lib/review-stores.mjs';

const review = () => ({ requestId: randomUUID(), rating: 5, name: 'Prueba local', location: 'Talca', message: 'Reseña de prueba aislada; no se publica en producción.', consent: true, website: '' });

test('adaptador privado Blob: escritura exclusiva y recuperación de respuesta perdida', async () => {
  const records = new Map();
  const store = createBlobReviewStore({
    put: async (key, body, options) => {
      assert.equal(options.access, 'private');
      assert.equal(options.allowOverwrite, false);
      if (records.has(key)) throw new Error('Existing pathname');
      records.set(key, JSON.parse(body));
    },
    get: async (key, options) => {
      assert.equal(options.access, 'private');
      return records.has(key) ? { stream: new Response(JSON.stringify(records.get(key))).body } : null;
    },
    list: async () => ({ blobs: [...records.keys()].map(url => ({ url })), hasMore: false })
  });
  const data = { ...validateReview(review()), createdAt: new Date().toISOString() };
  assert.equal(await store.insert('reviews/v1/test.json', data), null);
  assert.deepEqual(await store.insert('reviews/v1/test.json', data), data);
  assert.deepEqual((await store.list()).reviews, [data]);
});

test('validación de valoración, consentimiento, límites y honeypot', () => {
  const valid = review();
  assert.equal(validateReview({ ...valid, name: '' }).name, 'Cliente BYN');
  for (const body of [null, [], { ...valid, rating: 6 }, { ...valid, rating: 2.5 }, { ...valid, consent: false }, { ...valid, message: 'corto' }, { ...valid, message: 'a'.repeat(501) }, { ...valid, name: 'a'.repeat(61) }, { ...valid, website: 'bot' }, { ...valid, requestId: '../bad' }]) {
    assert.throws(() => validateReview(body));
  }
});

test('guardado persistente, reintentos, protección básica y paginación', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'byn-reviews-tests-'));
  let clock = Date.now();
  const store = createLocalReviewStore(directory);
  const handler = createReviewsHandler({ store, rateSecret: 'test-only', now: () => clock });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/reviews`;
  const post = (body, origin = 'http://localhost') => fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
  try {
    assert.deepEqual((await (await fetch(base)).json()).reviews, []);
    const first = review();
    const saved = await post(first);
    assert.equal(saved.status, 201);
    assert.equal((await saved.json()).review.id, first.requestId);
    assert.equal((await post(first)).status, 200);
    const limited = await post(review());
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get('Retry-After'));
    assert.equal((await post(review(), 'https://untrusted.example')).status, 403);
    assert.equal((await post({ ...review(), rating: 0 })).status, 400);
    assert.equal((await fetch(base, { method: 'DELETE' })).status, 405);
    assert.equal((await fetch(base, { method: 'POST', body: 'not json' })).status, 415);
    assert.equal((await post({ ...review(), message: 'x'.repeat(5000) })).status, 413);
    const rebuilt = createLocalReviewStore(directory);
    assert.equal((await rebuilt.list()).reviews[0].id, first.requestId);
    for (let i = 0; i < 7; i++) {
      clock += 300001;
      assert.equal((await post(review())).status, 201);
    }
    const page1 = await (await fetch(base)).json();
    const page2 = await (await fetch(`${base}?cursor=${encodeURIComponent(page1.cursor)}`)).json();
    assert.equal(page1.reviews.length, 6);
    assert.equal(page2.reviews.length, 2);
    assert.equal(page2.cursor, null);
    assert.equal(new Set([...page1.reviews, ...page2.reviews].map(item => item.id)).size, 8);
    assert.ok(page1.reviews[0].createdAt > page2.reviews[0].createdAt);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('no se afirma guardado si el almacenamiento falla', async () => {
  const handler = createReviewsHandler({ store: { list: async () => { throw new Error('Unavailable'); } }, rateSecret: 'test-only' });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reviews`);
    assert.equal(response.status, 503);
    assert.ok((await response.json()).error);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
