import {NextRequest} from 'next/server';
import dedent from 'dedent';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {env} from '@/env';
import {OPTIONS, POST} from './route';

const {createShare} = vi.hoisted(() => ({createShare: vi.fn<() => string>()}));

vi.mock('@/db/shares', () => ({createShare}));

const ENDPOINT = `${env.BASE_URL}/api/diffs`;

const PATCH = dedent`
  diff --git a/src/a.ts b/src/a.ts
  index 0000001..0000002 100644
  --- a/src/a.ts
  +++ b/src/a.ts
  @@ -1,2 +1,2 @@
  -old line
  +new line
   context
`;

function post(body: string, headers: Record<string, string>) {
  return new NextRequest(ENDPOINT, {method: 'POST', headers, body});
}

beforeEach(() => {
  createShare.mockReset();
  createShare.mockResolvedValue('share-id');
});

describe('OPTIONS', () => {
  it('answers the preflight with the CORS allowances', async () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'POST, OPTIONS',
    );
  });
});

describe('POST', () => {
  it('creates a share from a JSON body', async () => {
    const response = await POST(
      post(JSON.stringify({patches: [[{name: 'src/a.ts', hunks: []}]]}), {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      url: `${env.BASE_URL}/d/share-id`,
    });
  });

  it('parses a raw patch body and answers in plain text', async () => {
    const response = await POST(
      post(PATCH, {'Content-Type': 'text/plain', Accept: 'text/plain'}),
    );

    expect(response.status).toBe(201);
    await expect(response.text()).resolves.toBe(`${env.BASE_URL}/d/share-id`);
    expect(createShare).toHaveBeenCalledWith([
      [expect.objectContaining({name: 'src/a.ts'})],
    ]);
  });

  it('rejects an empty patch list without touching the database', async () => {
    const response = await POST(
      post(JSON.stringify({patches: []}), {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Invalid patches',
    });
    expect(createShare).not.toHaveBeenCalled();
  });

  it('reports unparseable patch text in the requested format', async () => {
    const response = await POST(
      post('not a patch', {'Content-Type': 'text/plain', Accept: 'text/plain'}),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Invalid patches');
  });

  it('rejects a malformed JSON body', async () => {
    const response = await POST(
      post('{not json', {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Invalid JSON body',
    });
    expect(createShare).not.toHaveBeenCalled();
  });

  it('rejects a body that fails mid-stream', async () => {
    const request = post('', {
      'Content-Type': 'text/plain',
      Accept: 'text/plain',
    });
    vi.spyOn(request, 'text').mockRejectedValue(new Error('connection reset'));

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Invalid text body');
    expect(createShare).not.toHaveBeenCalled();
  });
});
