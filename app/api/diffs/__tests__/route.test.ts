import {describe, expect, it} from 'vitest';

import {setupTestDb} from '@/db/__tests__/setup';
import {openShare} from '@/db/shares';
import {fileDiffs, gitPatch} from '@/diffs/__tests__/patches';
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

function postJson(value: unknown, headers: HeadersInit = {}) {
  return post(JSON.stringify(value), {
    'Content-Type': 'application/json',
    ...headers,
  });
}

function shareIdFrom(url: string | null) {
  return SHARE_URL.exec(url ?? '')?.[1];
}

async function openedNames(response: Response) {
  const shareId = shareIdFrom(response.headers.get('Location'));
  const files = await openShare(shareId!);
  return files?.map(({name}) => name);
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
    const response = await postText(gitPatch('a.ts', 'b.ts'));

    expect(response.status).toBe(201);
    await expect(openedNames(response)).resolves.toEqual(['a.ts', 'b.ts']);
  });

  it('creates a share from JSON patches', async () => {
    const response = await postJson({
      patches: [fileDiffs('a.ts'), fileDiffs('b.ts')],
    });

    expect(response.status).toBe(201);
    await expect(openedNames(response)).resolves.toEqual(['a.ts', 'b.ts']);
  });

  it('responds with the share as JSON', async () => {
    const response = await postText(gitPatch('a.ts'));
    const location = response.headers.get('Location');
    const shareId = shareIdFrom(location);

    expect(shareId).toBeDefined();
    await expect(response.json()).resolves.toEqual({
      name: `shares/${shareId}`,
      url: location,
    });
  });

  it('responds with the share URL as text when preferred', async () => {
    const response = await postText(gitPatch('a.ts'), {Accept: 'text/plain'});

    expect(response.status).toBe(201);
    await expect(response.text()).resolves.toBe(
      response.headers.get('Location'),
    );
  });

  it('exposes the Location header to other origins', async () => {
    const response = await postText(gitPatch('a.ts'));

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

  it.each([
    ['no patches', {patches: []}],
    ['a missing patches field', {}],
    ['a non-array patch', {patches: ['a.ts']}],
  ])('rejects JSON with %s', async (_name, body) => {
    const response = await postJson(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {reason: 'INVALID_FIELDS'},
    });
  });

  it('rejects malformed JSON', async () => {
    const response = await post('{nope', {'Content-Type': 'application/json'});

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {reason: 'INVALID_JSON'},
    });
  });

  it('adds CORS headers to errors', async () => {
    const response = await postText('not a patch');

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
