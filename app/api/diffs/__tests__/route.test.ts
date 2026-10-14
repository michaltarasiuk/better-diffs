import {eq} from 'drizzle-orm';
import {describe, expect, it} from 'vitest';

import {setupTestDb} from '@/db/__tests__/setup';
import {db} from '@/db/db';
import {shares} from '@/db/schema';
import {getShareFiles, getSharePatch} from '@/db/shares';
import {gitPatch} from '@/diffs/__tests__/patches';
import {env} from '@/env';

import {OPTIONS, POST} from '../route';

setupTestDb();

const SHARE_URL = new RegExp(`^${env.BASE_URL}/d/([0-9a-f-]{36})$`);

function post(body: BodyInit, headers: HeadersInit) {
  const request = new Request(`${env.BASE_URL}/api/diffs`, {
    method: 'POST',
    body,
    headers,
  });
  return POST(request, {});
}

function postText(text: string, headers: HeadersInit = {}) {
  return post(text, {'Content-Type': 'text/plain', ...headers});
}

function shareIdFrom(url: string | null) {
  return SHARE_URL.exec(url ?? '')?.[1];
}

async function openedNames(response: Response) {
  const shareId = shareIdFrom(response.headers.get('Location'));
  const files = await getShareFiles(shareId!);
  return files.map(({name}) => name);
}

describe('OPTIONS', () => {
  it('allows cross-origin posts', () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'POST, OPTIONS',
    );
  });
});

describe('POST', () => {
  it('creates a share from patch text', async () => {
    const response = await postText(gitPatch('a.txt', 'b.txt'));

    expect(response.status).toBe(201);
    await expect(openedNames(response)).resolves.toEqual(['a.txt', 'b.txt']);
  });

  it('stores the patch text', async () => {
    const text = gitPatch('a.txt');
    const response = await postText(text);
    const shareId = shareIdFrom(response.headers.get('Location'));

    await expect(getSharePatch(shareId!)).resolves.toBe(text);
  });

  it('responds with the share as JSON', async () => {
    const response = await postText(gitPatch('a.txt'));
    const location = response.headers.get('Location');
    const shareId = shareIdFrom(location);

    expect(shareId).toBeDefined();
    await expect(response.json()).resolves.toEqual({
      name: `shares/${shareId}`,
      url: location,
    });
  });

  it('responds with the share URL as text when preferred', async () => {
    const response = await postText(gitPatch('a.txt'), {Accept: 'text/plain'});

    expect(response.status).toBe(201);
    await expect(response.text()).resolves.toBe(
      response.headers.get('Location'),
    );
  });

  it('exposes the Location header to other origins', async () => {
    const response = await postText(gitPatch('a.txt'));

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Expose-Headers')).toBe(
      'Location',
    );
  });

  it('rejects patch text without file changes', async () => {
    const response = await postText('not a patch');

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {status: 'INVALID_ARGUMENT', reason: 'EMPTY_PATCH'},
    });
  });

  it('rejects JSON bodies', async () => {
    const response = await post(JSON.stringify({patches: []}), {
      'Content-Type': 'application/json',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {reason: 'EMPTY_PATCH'},
    });
  });

  it('rejects patch text over 2 MiB', async () => {
    const text = gitPatch('a.txt') + 'x'.repeat(2 * 1024 * 1024);

    const response = await postText(text);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {reason: 'PATCH_TOO_LARGE', metadata: {maxBytes: '2097152'}},
    });
  });

  it('rejects a declared length over 2 MiB before reading the body', async () => {
    const response = await postText(gitPatch('a.txt'), {
      'Content-Length': String(2 * 1024 * 1024 + 1),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {reason: 'PATCH_TOO_LARGE'},
    });
  });

  it('limits each client to 30 uploads an hour', async () => {
    const client = {'X-Real-IP': '203.0.113.7'};
    for (let index = 0; index < 30; index++) {
      const response = await postText(gitPatch('a.txt'), client);
      expect(response.status).toBe(201);
    }

    const limited = await postText(gitPatch('a.txt'), {
      ...client,
      Accept: 'text/plain',
    });
    const other = await postText(gitPatch('a.txt'), {
      'X-Real-IP': '203.0.113.8',
    });

    expect(limited.status).toBe(429);
    await expect(limited.text()).resolves.toBe(
      'Upload limit reached: 30 diffs an hour. Try again later.',
    );
    expect(other.status).toBe(201);
  });

  it('does not store the client address', async () => {
    const response = await postText(gitPatch('a.txt'), {
      'X-Real-IP': '203.0.113.7',
    });
    const shareId = shareIdFrom(response.headers.get('Location'));

    const [share] = await db
      .select({uploaderKey: shares.uploaderKey})
      .from(shares)
      .where(eq(shares.id, shareId!));

    expect(share?.uploaderKey).toEqual(expect.any(String));
    expect(share?.uploaderKey).not.toContain('203.0.113.7');
  });

  it('adds CORS headers to errors', async () => {
    const response = await postText('not a patch');

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
