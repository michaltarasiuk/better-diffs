import {describe, expect, it, vi} from 'vitest';
import {z} from 'zod';

import {ApiError} from '../error';
import {fetchJson} from '../fetch';

const Body = z.object({id: z.string()});

function stubFetch(response: Response) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('fetchJson', () => {
  it('passes the request through to fetch', async () => {
    const fetch = stubFetch(Response.json({id: '1'}));
    const init = {cache: 'no-store'} as const;

    await fetchJson('/api/thing', Body, init);

    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/thing', init);
  });

  it('parses a successful response with the schema', async () => {
    stubFetch(Response.json({id: '1', extra: true}));

    await expect(fetchJson('/api/thing', Body)).resolves.toEqual({id: '1'});
  });

  it('rejects a successful response that does not match the schema', async () => {
    stubFetch(Response.json({id: 1}));

    await expect(fetchJson('/api/thing', Body)).rejects.toThrow(z.ZodError);
  });

  it('throws an ApiError for an error response', async () => {
    const error = new ApiError('NOT_FOUND', 'Share not found.', {
      reason: 'SHARE_NOT_FOUND',
    });
    stubFetch(Response.json(error, {status: 404}));

    const promise = fetchJson('/api/thing', Body);

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      code: 'NOT_FOUND',
      reason: 'SHARE_NOT_FOUND',
    });
  });
});
