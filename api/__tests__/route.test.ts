import {redirect} from 'next/navigation';
import {describe, expect, it, vi} from 'vitest';
import {z} from 'zod';

import {env} from '@/env';
import {isDefined} from '@/utils/is-defined';

import {ApiError} from '../error';
import {parse, parseSearchParams, prefersText, readJson, route} from '../route';

const ROUTE_URL = `${env.BASE_URL}/api/thing`;

function request(init?: RequestInit, url = ROUTE_URL) {
  return new Request(url, init);
}

describe('route', () => {
  it('returns the handler response', async () => {
    const handler = vi.fn(async () => Response.json({ok: true}));
    const context = {params: Promise.resolve({})};
    const req = request();

    const response = await route(handler)(req, context);

    expect(handler).toHaveBeenCalledExactlyOnceWith(req, context);
    await expect(response.json()).resolves.toEqual({ok: true});
  });

  it('adds headers to successful responses', async () => {
    const handler = route(async () => new Response('ok'), {
      headers: {'Cache-Control': 'no-store'},
    });

    const response = await handler(request(), {});

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('serializes an ApiError as JSON', async () => {
    const error = new ApiError('NOT_FOUND', 'Share not found.', {
      reason: 'SHARE_NOT_FOUND',
    });
    const handler = route(async () => {
      throw error;
    });

    const response = await handler(request(), {});

    expect(response.status).toBe(404);
    expect(response.headers.has('WWW-Authenticate')).toBe(false);
    await expect(response.json()).resolves.toEqual(
      JSON.parse(JSON.stringify(error)),
    );
  });

  it('serializes an ApiError as text when preferred', async () => {
    const handler = route(async () => {
      throw new ApiError('NOT_FOUND', 'Share not found.', {
        reason: 'SHARE_NOT_FOUND',
      });
    });

    const response = await handler(
      request({headers: {Accept: 'text/plain'}}),
      {},
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('Share not found.');
  });

  it('asks for a bearer token when unauthenticated', async () => {
    const handler = route(async () => {
      throw new ApiError('UNAUTHENTICATED', 'Sign in.', {
        reason: 'UNAUTHENTICATED',
      });
    });

    const response = await handler(request(), {});

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
  });

  it('hides unexpected errors behind an internal error', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const cause = new Error('database exploded');
    const handler = route(async () => {
      throw cause;
    });

    const response = await handler(request(), {});

    expect(consoleError).toHaveBeenCalledExactlyOnceWith(cause);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 500,
        status: 'INTERNAL',
        reason: 'INTERNAL',
        message: 'Internal error.',
      },
    });
  });

  it('adds headers to error responses', async () => {
    const handler = route(
      async () => {
        throw new ApiError('NOT_FOUND', 'Gone.', {reason: 'GONE'});
      },
      {headers: {'Cache-Control': 'no-store'}},
    );

    const response = await handler(request(), {});

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('rethrows Next.js navigation errors', async () => {
    const handler = route(async () => redirect('/'));

    await expect(handler(request(), {})).rejects.toMatchObject({
      digest: expect.stringMatching(/^NEXT_REDIRECT/),
    });
  });
});

describe('prefersText', () => {
  it.each([
    [null, false],
    ['*/*', false],
    ['application/json', false],
    ['text/plain', true],
    ['text/plain, application/json;q=0.5', true],
    ['text/plain;q=0.5, application/json', false],
    ['text/*', true],
  ])('returns %s for Accept: %s', (accept, expected) => {
    const headers = new Headers();
    if (isDefined(accept)) {
      headers.set('Accept', accept);
    }

    expect(prefersText(request({headers}))).toBe(expected);
  });
});

describe('parse', () => {
  const Schema = z.object({count: z.coerce.number().int()});

  it('returns the parsed value', () => {
    expect(parse(Schema, {count: '3'})).toEqual({count: 3});
  });

  it('throws an invalid argument error', () => {
    expect(() => parse(Schema, {count: 'x'})).toThrow(
      expect.objectContaining({
        code: 'INVALID_ARGUMENT',
        fieldViolations: [{field: 'count', description: expect.any(String)}],
      }),
    );
  });
});

describe('parseSearchParams', () => {
  it('parses the request search params', () => {
    const Schema = z.object({afterSeq: z.coerce.number().int()});

    expect(
      parseSearchParams(Schema, request(undefined, `${ROUTE_URL}?afterSeq=7`)),
    ).toEqual({afterSeq: 7});
  });
});

describe('readJson', () => {
  it('returns the parsed body', async () => {
    const req = request({method: 'POST', body: '{"a":1}'});

    await expect(readJson(req)).resolves.toEqual({a: 1});
  });

  it('throws an invalid argument error for malformed JSON', async () => {
    const req = request({method: 'POST', body: '{nope'});

    await expect(readJson(req)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      reason: 'INVALID_JSON',
    });
  });
});
