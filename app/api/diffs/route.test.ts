import {NextRequest} from 'next/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {env} from '@/env';
import {FIXTURE} from '@/fixtures/fixture';
import {OPTIONS, POST} from './route';

const {createShare} = vi.hoisted(() => ({
  createShare: vi.fn<typeof import('@/db/shares').createShare>(),
}));

vi.mock('@/db/shares', () => ({createShare}));

function request(body: string, headers: Record<string, string>) {
  return new NextRequest(`${env.BASE_URL}/api/diffs`, {
    method: 'POST',
    headers,
    body,
  });
}

beforeEach(() => {
  createShare.mockResolvedValue(FIXTURE.share.id);
});

describe('OPTIONS', () => {
  it('returns 204 for CORS preflight', () => {
    expect(OPTIONS().status).toBe(204);
  });

  it('allows cross-origin requests', () => {
    expect(OPTIONS().headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('allows POST and OPTIONS methods', () => {
    expect(OPTIONS().headers.get('Access-Control-Allow-Methods')).toBe(
      'POST, OPTIONS',
    );
  });
});

describe('POST', () => {
  it('returns 201 when creating a share from JSON', async () => {
    const response = await POST(
      request(JSON.stringify({patches: [[{name: 'src/a.ts', hunks: []}]]}), {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

    expect(response.status).toBe(201);
  });

  it('returns the share URL in JSON', async () => {
    const response = await POST(
      request(JSON.stringify({patches: [[{name: 'src/a.ts', hunks: []}]]}), {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

    expect(await response.json()).toEqual({
      ok: true,
      url: `${env.BASE_URL}/d/${FIXTURE.share.id}`,
    });
  });

  it('returns 201 for patch text input', async () => {
    const response = await POST(
      request(FIXTURE.patch.sample, {
        'Content-Type': 'text/plain',
        Accept: 'text/plain',
      }),
    );

    expect(response.status).toBe(201);
  });

  it('returns a plain-text share URL for patch text input', async () => {
    const response = await POST(
      request(FIXTURE.patch.sample, {
        'Content-Type': 'text/plain',
        Accept: 'text/plain',
      }),
    );

    expect(await response.text()).toBe(`${env.BASE_URL}/d/${FIXTURE.share.id}`);
  });

  it('passes parsed patches to createShare for patch text input', async () => {
    await POST(
      request(FIXTURE.patch.sample, {
        'Content-Type': 'text/plain',
        Accept: 'text/plain',
      }),
    );

    expect(createShare).toHaveBeenCalledExactlyOnceWith([
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
  });

  it('returns an invalid patches error for empty patches', async () => {
    const response = await POST(
      request(JSON.stringify({patches: []}), {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

    expect(await response.json()).toEqual({
      ok: false,
      error: 'Invalid patches',
    });
  });

  it('skips share creation for empty patches', async () => {
    await POST(
      request(JSON.stringify({patches: []}), {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

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
  });

  it('returns an invalid patches error for patch text input', async () => {
    const response = await POST(
      request('not a patch', {
        'Content-Type': 'text/plain',
        Accept: 'text/plain',
      }),
    );

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
  });

  it('returns an invalid JSON body error for malformed JSON', async () => {
    const response = await POST(
      request('{not json', {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

    expect(await response.json()).toEqual({
      ok: false,
      error: 'Invalid JSON body',
    });
  });

  it('skips share creation for malformed JSON', async () => {
    await POST(
      request('{not json', {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    );

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
  });

  it('returns an invalid text body error when the body cannot be read', async () => {
    const req = request('', {
      'Content-Type': 'text/plain',
      Accept: 'text/plain',
    });
    vi.spyOn(req, 'text').mockRejectedValue(new Error('Connection reset'));

    const response = await POST(req);

    expect(await response.text()).toBe('Invalid text body');
  });

  it('skips share creation when the body cannot be read', async () => {
    const req = request('', {
      'Content-Type': 'text/plain',
      Accept: 'text/plain',
    });
    vi.spyOn(req, 'text').mockRejectedValue(new Error('Connection reset'));

    await POST(req);

    expect(createShare).not.toHaveBeenCalled();
  });
});
