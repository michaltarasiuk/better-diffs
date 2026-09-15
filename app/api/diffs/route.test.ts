import {NextRequest} from 'next/server';
import dedent from 'dedent';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {env} from '@/env';
import {OPTIONS, POST} from './route';

const {createShare} = vi.hoisted(() => ({createShare: vi.fn<() => string>()}));

vi.mock('@/db/shares', () => ({createShare}));

const SHARE_ID = 'share-id';

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

function request(body: string, headers: Record<string, string>) {
  return new NextRequest(`${env.BASE_URL}/api/diffs`, {
    method: 'POST',
    headers,
    body,
  });
}

beforeEach(() => {
  createShare.mockReset();
  createShare.mockResolvedValue(SHARE_ID);
});

describe('OPTIONS', () => {
  it('returns CORS preflight headers', async () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'POST, OPTIONS',
    );
  });
});

describe('POST', () => {
  it('creates a share from JSON', async () => {
    const response = await POST(
      request(JSON.stringify({patches: [[{name: 'src/a.ts', hunks: []}]]}), {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ok: true,
      url: `${env.BASE_URL}/d/${SHARE_ID}`,
    });
  });

  it('returns a plain-text share URL for patch text input', async () => {
    const response = await POST(
      request(PATCH, {'Content-Type': 'text/plain', Accept: 'text/plain'}),
    );

    expect(response.status).toBe(201);
    expect(await response.text()).toBe(`${env.BASE_URL}/d/${SHARE_ID}`);
    expect(createShare).toHaveBeenCalledWith([
      [expect.objectContaining({name: 'src/a.ts'})],
    ]);
  });

  it('returns 400 for empty patches', async () => {
    const response = await POST(
      request(JSON.stringify({patches: []}), {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Invalid patches',
    });

    expect(createShare).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid patch text', async () => {
    const response = await POST(
      request('not a patch', {
        'Content-Type': 'text/plain',
        Accept: 'text/plain',
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid patches');
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(
      request('{not json', {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Invalid JSON body',
    });

    expect(createShare).not.toHaveBeenCalled();
  });

  it('returns 400 when the body cannot be read', async () => {
    const req = request('', {
      'Content-Type': 'text/plain',
      Accept: 'text/plain',
    });
    vi.spyOn(req, 'text').mockRejectedValue(new Error('Connection reset'));

    const response = await POST(req);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid text body');

    expect(createShare).not.toHaveBeenCalled();
  });
});
