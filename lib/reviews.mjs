import { createHmac } from 'node:crypto';

export class ReviewError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function cleanText(value, limit, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw new ReviewError(400, 'Revisa los datos de tu reseña.');
  const text = value.normalize('NFC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
  if (text.length > limit || (required && text.length < 10)) {
    throw new ReviewError(400, required ? 'Escribe una experiencia de entre 10 y 500 caracteres.' : `Usa un máximo de ${limit} caracteres en nombre y comuna.`);
  }
  return text;
}

export function validateReview(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ReviewError(400, 'Revisa los datos de tu reseña.');
  if (body.website) throw new ReviewError(400, 'No se pudo publicar esta reseña.');
  if (body.consent !== true) throw new ReviewError(400, 'Confirma que deseas publicar tu reseña.');
  if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) throw new ReviewError(400, 'Selecciona una valoración de 1 a 5 estrellas.');
  if (typeof body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) {
    throw new ReviewError(400, 'Recarga la página y vuelve a intentarlo.');
  }
  return {
    id: body.requestId,
    rating: body.rating,
    name: cleanText(body.name, 60) || 'Cliente BYN',
    location: cleanText(body.location, 60),
    message: cleanText(body.message, 500, true)
  };
}

async function readBody(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) throw new ReviewError(415, 'Envía la reseña desde el formulario de la web.');
  if (Number(request.headers['content-length']) > 4096) throw new ReviewError(413, 'La reseña es demasiado larga.');
  if (request.body !== undefined) {
    if (Buffer.byteLength(JSON.stringify(request.body)) > 4096) throw new ReviewError(413, 'La reseña es demasiado larga.');
    try { return typeof request.body === 'string' ? JSON.parse(request.body) : request.body; }
    catch { throw new ReviewError(400, 'No se pudo leer la reseña.'); }
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 4096) throw new ReviewError(413, 'La reseña es demasiado larga.');
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ReviewError(400, 'No se pudo leer la reseña.'); }
}

export function createReviewsHandler({ store, rateSecret, production = false, now = Date.now }) {
  return async (request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(JSON.stringify(body));
    };
    try {
      if (!['GET', 'POST'].includes(request.method)) {
        response.setHeader('Allow', 'GET, POST');
        throw new ReviewError(405, 'Método no permitido.');
      }
      if (request.method === 'GET') {
        const cursor = new URL(request.url, 'http://localhost').searchParams.get('cursor') || undefined;
        if (cursor && cursor.length > 2048) throw new ReviewError(400, 'Página no válida.');
        send(200, await store.list(cursor));
        return;
      }
      const origin = request.headers.origin;
      if (origin) {
        const allowedHosts = ['xn--climatizacinbynservicios-qmc.com', 'www.xn--climatizacinbynservicios-qmc.com', process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean);
        let url;
        try { url = new URL(origin); }
        catch { throw new ReviewError(403, 'Publica tu reseña desde la web de BYN Servicios.'); }
        const local = !production && ['127.0.0.1', 'localhost'].includes(url.hostname);
        if (!local && (url.protocol !== 'https:' || !allowedHosts.includes(url.hostname))) throw new ReviewError(403, 'Publica tu reseña desde la web de BYN Servicios.');
      }
      if (!rateSecret) throw new ReviewError(503, 'Las reseñas no están disponibles temporalmente. Inténtalo más tarde.');
      const review = validateReview(await readBody(request));
      const timestamp = now();
      const bucket = Math.floor(timestamp / 300000);
      // The same visitor gets one atomic storage slot per five minutes. No raw IP is stored.
      const ip = production ? String(request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for'] || request.socket?.remoteAddress || '').split(',')[0].trim() : request.socket?.remoteAddress || 'local';
      const fingerprint = createHmac('sha256', rateSecret).update(`${bucket}:${ip}`).digest('hex').slice(0, 32);
      const key = `reviews/v1/${String(1e12 - bucket).padStart(13, '0')}-${fingerprint}.json`;
      review.createdAt = new Date(timestamp).toISOString();
      const existing = await store.insert(key, review);
      if (existing && existing.id !== review.id) {
        response.setHeader('Retry-After', String(300 - Math.floor(timestamp / 1000) % 300));
        throw new ReviewError(429, 'Ya recibimos una reseña hace unos minutos. Espera cinco minutos antes de publicar otra.');
      }
      send(existing ? 200 : 201, { review: existing || review, message: 'Tu reseña quedó guardada y publicada. ¡Gracias por compartir tu experiencia!' });
    } catch (error) {
      if (!(error instanceof ReviewError)) console.error('Reviews storage unavailable:', error.name || 'StorageError');
      send(error.status || 503, { error: error instanceof ReviewError ? error.message : 'No pudimos guardar o cargar las reseñas. Inténtalo de nuevo en unos minutos.' });
    }
  };
}
