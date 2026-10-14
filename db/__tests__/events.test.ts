import {eq} from 'drizzle-orm';
import type {SerializedEditorState} from 'lexical';
import {describe, expect, it, vi} from 'vitest';

import type {ShareEventPayload} from '@/events/schemas';
import {newId} from '@/utils/new-id';

import {db} from '../db';
import {appendEvents, getEvents, getSnapshot} from '../events';
import {user as userTable} from '../schema';
import {createShare} from '../shares';
import {allowAll, insertUser, setupTestDb} from './setup';

setupTestDb();

function body(text: string) {
  return {root: {text}} as unknown as SerializedEditorState;
}

function opened(shareId: string, threadId = newId()) {
  return {
    $type: 'thread.opened',
    threadId,
    anchor: {shareId, filePath: 'a.txt', side: 'additions', line: 1},
  } satisfies ShareEventPayload;
}

function created(threadId: string, commentId = newId(), text = 'hello') {
  return {
    $type: 'comment.created',
    threadId,
    commentId,
    body: body(text),
  } satisfies ShareEventPayload;
}

async function shareWithThread() {
  const {id: actorId} = await insertUser({name: 'Alice', image: null});
  const shareId = await createShare('', []);
  const threadId = newId();
  const commentId = newId();
  await appendEvents(
    shareId,
    actorId,
    [opened(shareId, threadId), created(threadId, commentId)],
    allowAll,
  );
  return {actorId, shareId, threadId, commentId};
}

describe('appendEvents', () => {
  it('numbers events from one', async () => {
    const {id: actorId} = await insertUser();
    const shareId = await createShare('', []);

    const appended = await appendEvents(
      shareId,
      actorId,
      [opened(shareId), opened(shareId)],
      allowAll,
    );

    expect(appended.map(({seq}) => seq)).toEqual([1, 2]);
  });

  it('keeps numbering across appends', async () => {
    const {id: actorId} = await insertUser();
    const shareId = await createShare('', []);

    await appendEvents(
      shareId,
      actorId,
      [opened(shareId), opened(shareId)],
      allowAll,
    );
    const appended = await appendEvents(
      shareId,
      actorId,
      [opened(shareId)],
      allowAll,
    );

    expect(appended.map(({seq}) => seq)).toEqual([3]);
  });

  it('numbers each share separately', async () => {
    const {id: actorId} = await insertUser();
    const first = await createShare('', []);
    const second = await createShare('', []);

    await appendEvents(first, actorId, [opened(first)], allowAll);
    const appended = await appendEvents(
      second,
      actorId,
      [opened(second)],
      allowAll,
    );

    expect(appended.map(({seq}) => seq)).toEqual([1]);
  });

  it('derives the type and subject from the payload', async () => {
    const {actorId, shareId, commentId} = await shareWithThread();

    const [event] = await appendEvents(
      shareId,
      actorId,
      [{$type: 'comment.deleted', commentId}],
      allowAll,
    );

    expect(event).toMatchObject({
      shareId,
      actorId,
      type: 'comment.deleted',
      subjectId: commentId,
    });
  });

  it('stores threads and comments', async () => {
    const {actorId, shareId, threadId, commentId} = await shareWithThread();

    const snapshot = await getSnapshot(shareId);

    expect(snapshot).toMatchObject({
      seq: 2,
      threads: [
        {
          id: threadId,
          anchor: {shareId, filePath: 'a.txt', side: 'additions', line: 1},
          actorId,
          actor: {name: 'Alice', image: null},
          resolved: false,
        },
      ],
      comments: [{id: commentId, threadId, actorId, body: body('hello')}],
    });
  });

  it('resolves a thread and edits a comment in place', async () => {
    const {actorId, shareId, threadId, commentId} = await shareWithThread();

    await appendEvents(
      shareId,
      actorId,
      [
        {$type: 'thread.resolved', threadId},
        {$type: 'comment.edited', commentId, body: body('edited')},
      ],
      allowAll,
    );

    const snapshot = await getSnapshot(shareId);
    expect(snapshot?.threads[0]?.resolved).toBe(true);
    expect(snapshot?.comments[0]?.body).toEqual(body('edited'));
  });

  it('deletes a comment for good', async () => {
    const {actorId, shareId, commentId} = await shareWithThread();

    await appendEvents(
      shareId,
      actorId,
      [{$type: 'comment.deleted', commentId}],
      allowAll,
    );

    const snapshot = await getSnapshot(shareId);
    expect(snapshot?.comments).toEqual([]);
  });

  it('validates against the records the payloads refer to', async () => {
    const {actorId, shareId, threadId, commentId} = await shareWithThread();
    const deletedId = newId();
    await appendEvents(
      shareId,
      actorId,
      [
        created(threadId, deletedId),
        {$type: 'comment.deleted', commentId: deletedId},
      ],
      allowAll,
    );
    const validate = vi.fn();

    await appendEvents(
      shareId,
      actorId,
      [
        {$type: 'comment.edited', commentId, body: body('edited')},
        {$type: 'comment.deleted', commentId: deletedId},
      ],
      validate,
    );

    expect(validate).toHaveBeenCalledExactlyOnceWith({
      threads: [expect.objectContaining({id: threadId})],
      comments: [expect.objectContaining({id: commentId})],
      deletedCommentIds: [deletedId],
    });
  });

  it('stores nothing when validation fails', async () => {
    const {actorId, shareId, threadId} = await shareWithThread();

    await expect(
      appendEvents(shareId, actorId, [created(threadId)], () => {
        throw new Error('Refused');
      }),
    ).rejects.toThrow('Refused');

    const snapshot = await getSnapshot(shareId);
    expect(snapshot?.seq).toBe(2);
    expect(snapshot?.comments).toHaveLength(1);
  });

  it('returns nothing for an empty batch', async () => {
    await expect(appendEvents(newId(), newId(), [], allowAll)).resolves.toEqual(
      [],
    );
  });

  it('throws for an unknown share', async () => {
    const {id: actorId} = await insertUser();
    const shareId = newId();

    await expect(
      appendEvents(shareId, actorId, [opened(shareId)], allowAll),
    ).rejects.toThrow(`Share not found: ${shareId}`);
  });

  it('rolls back the seq when the insert fails', async () => {
    const shareId = await createShare('', []);
    const {id: actorId} = await insertUser();

    await expect(
      appendEvents(shareId, newId(), [opened(shareId)], allowAll),
    ).rejects.toThrow();
    const [event] = await appendEvents(
      shareId,
      actorId,
      [opened(shareId)],
      allowAll,
    );

    expect(event?.seq).toBe(1);
  });

  it('refuses to delete an actor whose events would vanish', async () => {
    const {actorId, shareId} = await shareWithThread();

    await expect(
      db.delete(userTable).where(eq(userTable.id, actorId)),
    ).rejects.toThrow();
    await expect(getEvents(shareId)).resolves.toHaveLength(2);
  });
});

describe('getEvents', () => {
  it('returns events in seq order with their subjects as stored', async () => {
    const {actorId, shareId, threadId, commentId} = await shareWithThread();
    await appendEvents(
      shareId,
      actorId,
      [{$type: 'comment.edited', commentId, body: body('edited')}],
      allowAll,
    );

    const events = await getEvents(shareId);

    expect(events).toMatchObject([
      {seq: 1, type: 'thread.opened', thread: {id: threadId}},
      {seq: 2, type: 'comment.created', comment: {body: body('edited')}},
      {seq: 3, type: 'comment.edited', comment: {body: body('edited')}},
    ]);
    expect(events[0]).toMatchObject({
      thread: {actor: {name: 'Alice', image: null}},
    });
  });

  it("never serves a deleted comment's body", async () => {
    const {actorId, shareId, commentId} = await shareWithThread();
    await appendEvents(
      shareId,
      actorId,
      [
        {$type: 'comment.edited', commentId, body: body('edited')},
        {$type: 'comment.deleted', commentId},
      ],
      allowAll,
    );

    const events = await getEvents(shareId);

    expect(events.slice(1)).toEqual([
      expect.objectContaining({type: 'comment.created', comment: null}),
      expect.objectContaining({type: 'comment.edited', comment: null}),
      expect.not.objectContaining({comment: expect.anything()}),
    ]);
  });

  it('returns events after the given seq', async () => {
    const {id: actorId} = await insertUser();
    const shareId = await createShare('', []);
    await appendEvents(
      shareId,
      actorId,
      [opened(shareId), opened(shareId), opened(shareId)],
      allowAll,
    );

    const events = await getEvents(shareId, 1);

    expect(events.map(({seq}) => seq)).toEqual([2, 3]);
  });

  it('only returns events of the given share', async () => {
    const {id: actorId} = await insertUser();
    const shareId = await createShare('', []);
    const otherShareId = await createShare('', []);
    await appendEvents(otherShareId, actorId, [opened(otherShareId)], allowAll);

    await expect(getEvents(shareId)).resolves.toEqual([]);
  });
});

describe('getSnapshot', () => {
  it('lists comments in the order they were created', async () => {
    const {actorId, shareId, threadId, commentId} = await shareWithThread();
    const replyId = newId();
    await appendEvents(
      shareId,
      actorId,
      [created(threadId, replyId)],
      allowAll,
    );
    await appendEvents(
      shareId,
      actorId,
      [{$type: 'comment.edited', commentId, body: body('edited')}],
      allowAll,
    );

    const snapshot = await getSnapshot(shareId);

    expect(snapshot?.seq).toBe(4);
    expect(snapshot?.comments.map(({id}) => id)).toEqual([commentId, replyId]);
  });

  it('returns nothing for an unknown share', async () => {
    await expect(getSnapshot(newId())).resolves.toBeUndefined();
  });
});
