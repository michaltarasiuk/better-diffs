import {eq} from 'drizzle-orm';
import type {SerializedEditorState} from 'lexical';
import {describe, expect, it, vi} from 'vitest';

import {threadError} from '@/threads/errors';
import type {Change} from '@/threads/schemas';
import {newId} from '@/utils/new-id';

import {db} from '../db';
import {user as userTable} from '../schema';
import {createShare} from '../shares';
import {getSnapshot, saveChanges} from '../threads';
import {allowAll, insertUser, setupTestDb} from './setup';

setupTestDb();

function body(text: string) {
  return {root: {text}} as unknown as SerializedEditorState;
}

function opened(threadId = newId()) {
  return {
    type: 'openThread',
    threadId,
    anchor: {filePath: 'a.txt', side: 'additions', line: 1},
  } satisfies Change;
}

function created(threadId: string, commentId = newId(), text = 'hello') {
  return {
    type: 'createComment',
    threadId,
    commentId,
    body: body(text),
  } satisfies Change;
}

async function shareWithThread() {
  const {id: actorId} = await insertUser({name: 'Alice', image: null});
  const shareId = await createShare('', []);
  const threadId = newId();
  const commentId = newId();
  await saveChanges(
    shareId,
    actorId,
    [opened(threadId), created(threadId, commentId)],
    allowAll,
  );
  return {actorId, shareId, threadId, commentId};
}

describe('saveChanges', () => {
  it('stores threads and comments', async () => {
    const {actorId, shareId, threadId, commentId} = await shareWithThread();

    const snapshot = await getSnapshot(shareId);

    expect(snapshot).toMatchObject({
      revision: 1,
      threads: [
        {
          id: threadId,
          anchor: {filePath: 'a.txt', side: 'additions', line: 1},
          actorId,
          actor: {name: 'Alice', image: null},
          resolved: false,
        },
      ],
      comments: [
        {
          id: commentId,
          threadId,
          actorId,
          actor: {name: 'Alice', image: null},
          body: body('hello'),
        },
      ],
    });
  });

  it('bumps the revision once per save', async () => {
    const {actorId, shareId, threadId} = await shareWithThread();

    await saveChanges(shareId, actorId, [created(threadId)], allowAll);

    await expect(getSnapshot(shareId)).resolves.toMatchObject({revision: 2});
  });

  it('resolves a thread and edits a comment in place', async () => {
    const {actorId, shareId, threadId, commentId} = await shareWithThread();

    await saveChanges(
      shareId,
      actorId,
      [
        {type: 'resolveThread', threadId},
        {type: 'editComment', commentId, body: body('edited')},
      ],
      allowAll,
    );

    const snapshot = await getSnapshot(shareId);
    expect(snapshot?.threads[0]?.resolved).toBe(true);
    expect(snapshot?.comments[0]?.body).toEqual(body('edited'));
  });

  it('deletes a comment for good', async () => {
    const {actorId, shareId, commentId} = await shareWithThread();

    await saveChanges(
      shareId,
      actorId,
      [{type: 'deleteComment', commentId}],
      allowAll,
    );

    const snapshot = await getSnapshot(shareId);
    expect(snapshot?.comments).toEqual([]);
  });

  it('validates against the threads the changes refer to, with their comments', async () => {
    const {actorId, shareId, threadId, commentId} = await shareWithThread();
    const replyId = newId();
    await saveChanges(shareId, actorId, [created(threadId, replyId)], allowAll);
    await shareWithThread();
    const validate = vi.fn(allowAll);

    await saveChanges(
      shareId,
      actorId,
      [{type: 'editComment', commentId, body: body('edited')}],
      validate,
    );

    expect(validate).toHaveBeenCalledExactlyOnceWith({
      threads: [expect.objectContaining({id: threadId})],
      comments: [
        expect.objectContaining({id: commentId}),
        expect.objectContaining({id: replyId}),
      ],
    });
  });

  it('stores nothing when validation fails', async () => {
    const {actorId, shareId, threadId} = await shareWithThread();

    const refused = threadError('THREAD_RESOLVED', 'Refused');

    await expect(
      saveChanges(shareId, actorId, [created(threadId)], () => refused),
    ).resolves.toBe(refused);

    const snapshot = await getSnapshot(shareId);
    expect(snapshot?.revision).toBe(1);
    expect(snapshot?.comments).toHaveLength(1);
  });

  it('does nothing for an empty batch', async () => {
    await expect(
      saveChanges(newId(), newId(), [], allowAll),
    ).resolves.toBeUndefined();
  });

  it('refuses an unknown share', async () => {
    const {id: actorId} = await insertUser();
    const shareId = newId();

    await expect(
      saveChanges(shareId, actorId, [opened()], allowAll),
    ).resolves.toEqual({
      reason: 'SHARE_NOT_FOUND',
      message: `Share not found: ${shareId}`,
    });
  });

  it('rolls back the revision when a write fails', async () => {
    const shareId = await createShare('', []);

    await expect(
      saveChanges(shareId, newId(), [opened()], allowAll),
    ).rejects.toThrow();

    await expect(getSnapshot(shareId)).resolves.toMatchObject({revision: 0});
  });

  it('refuses to delete a user who has threads or comments', async () => {
    const {actorId, shareId} = await shareWithThread();

    await expect(
      db.delete(userTable).where(eq(userTable.id, actorId)),
    ).rejects.toThrow();
    await expect(getSnapshot(shareId)).resolves.toMatchObject({
      threads: [expect.anything()],
      comments: [expect.anything()],
    });
  });
});

describe('getSnapshot', () => {
  it('lists comments in the order they were created', async () => {
    const {actorId, shareId, threadId, commentId} = await shareWithThread();
    const replyId = newId();
    await saveChanges(shareId, actorId, [created(threadId, replyId)], allowAll);
    await saveChanges(
      shareId,
      actorId,
      [{type: 'editComment', commentId, body: body('edited')}],
      allowAll,
    );

    const snapshot = await getSnapshot(shareId);

    expect(snapshot?.revision).toBe(3);
    expect(snapshot?.comments.map(({id}) => id)).toEqual([commentId, replyId]);
  });

  it('only returns rows of the given share', async () => {
    await shareWithThread();
    const shareId = await createShare('', []);

    await expect(getSnapshot(shareId)).resolves.toEqual({
      revision: 0,
      threads: [],
      comments: [],
    });
  });

  it('returns nothing when the revision is not newer', async () => {
    const {shareId} = await shareWithThread();

    await expect(getSnapshot(shareId, 1)).resolves.toBeUndefined();
    await expect(getSnapshot(shareId, 0)).resolves.toMatchObject({
      revision: 1,
    });
  });

  it('returns nothing for an unknown share', async () => {
    await expect(getSnapshot(newId())).resolves.toBeUndefined();
  });
});
