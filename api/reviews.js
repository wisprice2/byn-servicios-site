import { createReviewsHandler } from '../lib/reviews.mjs';
import { blobReviewStore } from '../lib/review-stores.mjs';

export default createReviewsHandler({
  store: blobReviewStore,
  rateSecret: process.env.REVIEWS_RATE_SECRET || process.env.BLOB_READ_WRITE_TOKEN,
  production: true
});
