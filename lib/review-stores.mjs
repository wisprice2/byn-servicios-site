import { get, list, put } from '@vercel/blob';

export function createBlobReviewStore(sdk = { get, list, put }) {
  return {
    async insert(key, review) {
      try {
        await sdk.put(key, JSON.stringify(review), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: false });
        return null;
      } catch (error) {
        // Also recover an acknowledged write whose response was lost. The SDK may
        // report an existing pathname as a generic BlobError rather than a subclass.
        const result = await sdk.get(key, { access: 'private', useCache: false });
        if (!result?.stream) throw error;
        return new Response(result.stream).json();
      }
    },
    async list(cursor) {
      const result = await sdk.list({ prefix: 'reviews/v1/', limit: 6, cursor });
      const reviews = await Promise.all(result.blobs.map(async blob => {
        const record = await sdk.get(blob.url, { access: 'private' });
        if (!record?.stream) throw new Error('ReviewReadFailed');
        return new Response(record.stream).json();
      }));
      reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { reviews, cursor: result.hasMore ? result.cursor : null };
    }
  };
}

export const blobReviewStore = createBlobReviewStore();
