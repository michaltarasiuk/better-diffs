import type {SerializedEditorState} from 'lexical';
import {describe, expect, it} from 'vitest';

import {allowAll, insertUser, setupTestDb} from '@/db/__tests__/setup';
import {createShare} from '@/db/shares';
import {saveChanges} from '@/db/threads';
import {env} from '@/env';
import {ShareSnapshot} from '@/threads/schemas';
import {newId} from '@/utils/new-id';

import {GET} from '../route';

setupTestDb();

function get(shareId: string, search = '') {
  const request = new Request(
    `${env.BASE_URL}/api/shares/${shareId}/threads${search}`,
  );
  return GET(request, {params: Promise.resolve({shareId})});
}

async function shareWithThreads(count: number) {
  const {id: actorId} = await insertUser();
  const shareId = await createShare('', []);
  for (let index = 0; index < count; index++) {
    const threadId = newId();
    await saveChanges(
      shareId,
      actorId,
      [
        {
          type: 'openThread',
          threadId,
          anchor: {filePath: 'a.txt', side: 'additions', line: 1},
        },
        {
          type: 'createComment',
          threadId,
          commentId: newId(),
          body: {root: {}} as SerializedEditorState,
        },
      ],
      allowAll,
    );
  }
  return shareId;
}

describe('GET', () => {
  it('returns the threads and comments of the share', async () => {
    const shareId = await shareWithThreads(2);

    const response = await get(shareId);
    const {snapshot} = await response.json();

    expect(response.status).toBe(200);
    expect(ShareSnapshot.parse(snapshot)).toMatchObject({
      revision: 2,
      threads: [expect.anything(), expect.anything()],
      comments: [expect.anything(), expect.anything()],
    });
  });

  it('returns them when changed after the given revision', async () => {
    const shareId = await shareWithThreads(2);

    const response = await get(shareId, '?afterRevision=1');
    const {snapshot} = await response.json();

    expect(snapshot).toMatchObject({revision: 2});
  });

  it('returns no snapshot when nothing changed', async () => {
    const shareId = await shareWithThreads(2);

    const response = await get(shareId, '?afterRevision=2');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({snapshot: null});
  });

  it('is never cached', async () => {
    const shareId = await shareWithThreads(0);

    const response = await get(shareId);

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns not found for an unknown share', async () => {
    const shareId = newId();

    const response = await get(shareId);

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      error: {reason: 'SHARE_NOT_FOUND', metadata: {shareId}},
    });
  });

  it.each([
    ['a negative', '-1'],
    ['a fractional', '1.5'],
    ['a non-numeric', 'abc'],
  ])('rejects %s afterRevision', async (_name, afterRevision) => {
    const shareId = await shareWithThreads(0);

    const response = await get(shareId, `?afterRevision=${afterRevision}`);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        reason: 'INVALID_FIELDS',
        fieldViolations: [{field: 'afterRevision'}],
      },
    });
  });
});
