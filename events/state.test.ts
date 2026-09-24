import {describe, expect, expectTypeOf, it, vi} from 'vitest';

import {
  createCommentCreated,
  createCommentDeleted,
  createCommentEdited,
  createLexicalBody,
  createOptimisticEvent,
  createShareEventLog,
  createThreadOpened,
  createThreadResolved,
} from '@/testkit/events';
import {uuid} from '@/testkit/uuid';
import type {CommentCreatedPayload, ShareEventPayload} from './schemas';
import {foldEvents, isType, ShareState} from './state';

function thread() {
  const opened = createThreadOpened();
  const {threadId} = opened;

  return {
    opened,
    threadId,
    comment(...[overrides]: Parameters<typeof createCommentCreated>) {
      return createCommentCreated({threadId, ...overrides});
    },
    edited(commentId: string, text: string) {
      return createCommentEdited({
        commentId,
        body: createLexicalBody(text),
      });
    },
    deleted(commentId: string) {
      return createCommentDeleted({commentId});
    },
    resolved() {
      return createThreadResolved({threadId});
    },
  };
}

describe('ingest', () => {
  it('folds a thread from its events', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const first = t.comment({body: createLexicalBody('value')});
    const second = t.comment();
    const events = log(t.opened, first, second);

    state.ingest(events);

    expect(state.threads.get(t.threadId)).toMatchObject({
      id: t.threadId,
      actorId: events[0]!.actorId,
      resolved: false,
      commentIds: [first.commentId, second.commentId],
    });
  });

  it('folds comments from their events', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const first = t.comment({body: createLexicalBody('value')});
    const second = t.comment();

    state.ingest(log(t.opened, first, second));

    expect(state.comments.get(first.commentId)).toMatchObject({
      threadId: t.threadId,
      body: createLexicalBody('value'),
    });
    expect(state.comments.has(second.commentId)).toBe(true);
  });

  it('removes comments after deletions', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();

    state.ingest(log(t.opened, created));
    state.ingest(
      log(
        t.edited(created.commentId, 'value-2'),
        t.deleted(created.commentId),
        t.resolved(),
      ),
    );

    expect(state.comments.has(created.commentId)).toBe(false);
    expect(state.deletedCommentIds.has(created.commentId)).toBe(true);
    expect(state.threads.get(t.threadId)?.commentIds).toEqual([]);
  });

  it('applies comment edits before deletions', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();

    state.ingest(log(t.opened, created));
    state.ingest(log(t.edited(created.commentId, 'value-2')));

    expect(state.comments.get(created.commentId)?.body).toEqual(
      createLexicalBody('value-2'),
    );
  });

  it('applies thread resolutions after comment changes', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();

    state.ingest(log(t.opened, created));
    state.ingest(
      log(
        t.edited(created.commentId, 'value-2'),
        t.deleted(created.commentId),
        t.resolved(),
      ),
    );

    expect(state.threads.get(t.threadId)?.resolved).toBe(true);
  });

  it('reports false when nothing was applied', () => {
    const state = new ShareState();

    expect(state.ingest([])).toBe(false);
  });

  it('reports true when events were applied', () => {
    const log = createShareEventLog();
    const state = new ShareState();

    expect(state.ingest(log(createThreadOpened()))).toBe(true);
  });

  it('refuses events that do not advance the sequence', () => {
    const state = new ShareState();
    const [first] = createShareEventLog()(createThreadOpened());

    state.ingest([first!]);

    expect(() => state.ingest([first!])).toThrow(/Invalid event seq:/);
  });
});

describe('ingest invariants', () => {
  it.each([
    {
      name: 'a comment on an unknown thread',
      payloads: () => [createCommentCreated()],
      error: /Thread not found/,
    },
    {
      name: 'reopening a thread',
      payloads: () => {
        const opened = createThreadOpened();
        return [opened, createThreadOpened({threadId: opened.threadId})];
      },
      error: /Thread already exists/,
    },
    {
      name: 'editing a deleted comment',
      payloads: () => {
        const t = thread();
        const created = t.comment();
        return [
          t.opened,
          created,
          t.deleted(created.commentId),
          t.edited(created.commentId, 'value'),
        ];
      },
      error: /Comment already deleted/,
    },
    {
      name: 'resolving a resolved thread',
      payloads: () => {
        const t = thread();
        return [t.opened, t.resolved(), t.resolved()];
      },
      error: /Thread already resolved/,
    },
  ])('rejects $name', ({payloads, error}) => {
    const log = createShareEventLog();
    const state = new ShareState();

    expect(() => state.ingest(log(...payloads()))).toThrow(error);
  });
});

describe('getSnapshot', () => {
  it('keeps returning the same reference until something changes', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened()));

    const snapshot = state.getSnapshot();

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('keeps the same reference after a no-op ingest', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened()));

    const snapshot = state.getSnapshot();
    state.ingest([]);

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('returns a new reference after ingest', () => {
    const log = createShareEventLog();
    const state = new ShareState();

    const before = state.getSnapshot();
    state.ingest(log(createThreadOpened()));

    expect(state.getSnapshot()).not.toBe(before);
  });

  it('returns a new reference after an optimistic update', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened()));

    const afterIngest = state.getSnapshot();
    state.optimistic(createOptimisticEvent(createThreadOpened()));

    expect(state.getSnapshot()).not.toBe(afterIngest);
  });

  it('bumps the snapshot version after an optimistic update', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened()));

    const afterIngest = state.getSnapshot();
    state.optimistic(createOptimisticEvent(createThreadOpened()));

    expect(state.getSnapshot().version).toBeGreaterThan(afterIngest.version);
  });

  it('exposes the live thread map while nothing is pending', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened()));

    expect(state.getSnapshot().threads).toBe(state.threads);
  });

  it('exposes the live comment map while nothing is pending', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened()));

    expect(state.getSnapshot().comments).toBe(state.comments);
  });

  it('exposes the live deleted comment ids while nothing is pending', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created, t.deleted(created.commentId)));

    expect(state.getSnapshot().deletedCommentIds).toBe(state.deletedCommentIds);
  });

  it('reports no pending ids while nothing is pending', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened()));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });
});

describe('optimistic', () => {
  it('returns a pending id for an optimistic thread', () => {
    const state = new ShareState();

    expect(
      state.optimistic(createOptimisticEvent(createThreadOpened())),
    ).toEqual(expect.any(String));
  });

  it('surfaces an optimistic thread in the snapshot', () => {
    const state = new ShareState();
    const opened = createThreadOpened();

    state.optimistic(createOptimisticEvent(opened));

    expect(state.getSnapshot().threads.get(opened.threadId)).toMatchObject({
      id: opened.threadId,
    });
  });

  it('marks an optimistic thread as pending', () => {
    const state = new ShareState();
    const opened = createThreadOpened();

    state.optimistic(createOptimisticEvent(opened));

    expect(state.getSnapshot().pendingIds.has(opened.threadId)).toBe(true);
  });

  it('leaves confirmed threads untouched by optimistic updates', () => {
    const state = new ShareState();
    const opened = createThreadOpened();

    state.optimistic(createOptimisticEvent(opened));

    expect(state.threads.has(opened.threadId)).toBe(false);
  });

  it('accepts a follow-up pending event on an optimistic thread', () => {
    const state = new ShareState();
    const t = thread();
    state.optimistic(createOptimisticEvent(t.opened));

    expect(() =>
      state.optimistic(createOptimisticEvent(t.comment())),
    ).not.toThrow();
  });

  it('surfaces a follow-up pending comment in the snapshot', () => {
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.optimistic(createOptimisticEvent(t.opened));
    state.optimistic(createOptimisticEvent(created));

    expect(state.getSnapshot().comments.get(created.commentId)).toMatchObject({
      threadId: t.threadId,
    });
  });

  it('rejects reopening an optimistic thread', () => {
    const state = new ShareState();
    const opened = createThreadOpened();
    state.optimistic(createOptimisticEvent(opened));

    expect(() =>
      state.optimistic(
        createOptimisticEvent(createThreadOpened({threadId: opened.threadId})),
      ),
    ).toThrow(/Thread already exists/);
  });

  it('rejects a comment on an unknown optimistic thread', () => {
    const state = new ShareState();
    state.optimistic(createOptimisticEvent(createThreadOpened()));

    expect(() =>
      state.optimistic(
        createOptimisticEvent(createCommentCreated({threadId: uuid()})),
      ),
    ).toThrow(/Thread not found/);
  });

  it('leaves confirmed thread ids untouched by optimistic updates', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment({body: createLexicalBody('value-1')});
    const pending = t.comment();
    state.ingest(log(t.opened, created));

    state.optimistic(createOptimisticEvent(pending));
    state.optimistic(
      createOptimisticEvent(t.edited(created.commentId, 'value-2')),
    );

    expect(state.threads.get(t.threadId)?.commentIds).toEqual([
      created.commentId,
    ]);
  });

  it('leaves confirmed comment bodies untouched by optimistic updates', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment({body: createLexicalBody('value-1')});
    state.ingest(log(t.opened, created));

    state.optimistic(createOptimisticEvent(t.comment()));
    state.optimistic(
      createOptimisticEvent(t.edited(created.commentId, 'value-2')),
    );

    expect(state.comments.get(created.commentId)?.body).toEqual(
      createLexicalBody('value-1'),
    );
  });

  it('surfaces optimistic thread changes only in the snapshot', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment({body: createLexicalBody('value-1')});
    const pending = t.comment();
    state.ingest(log(t.opened, created));

    state.optimistic(createOptimisticEvent(pending));
    state.optimistic(
      createOptimisticEvent(t.edited(created.commentId, 'value-2')),
    );

    expect(state.getSnapshot().threads.get(t.threadId)?.commentIds).toEqual([
      created.commentId,
      pending.commentId,
    ]);
  });

  it('surfaces optimistic comment edits only in the snapshot', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment({body: createLexicalBody('value-1')});
    state.ingest(log(t.opened, created));

    state.optimistic(createOptimisticEvent(t.comment()));
    state.optimistic(
      createOptimisticEvent(t.edited(created.commentId, 'value-2')),
    );

    expect(state.getSnapshot().comments.get(created.commentId)?.body).toEqual(
      createLexicalBody('value-2'),
    );
  });

  it('reuses untouched threads instead of copying them', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const other = thread();
    state.ingest(log(t.opened, other.opened));

    state.optimistic(createOptimisticEvent(t.resolved()));

    expect(state.getSnapshot().threads.get(other.threadId)).toBe(
      state.threads.get(other.threadId),
    );
  });

  it('copies threads that change during optimistic updates', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const other = thread();
    state.ingest(log(t.opened, other.opened));

    state.optimistic(createOptimisticEvent(t.resolved()));

    expect(state.getSnapshot().threads.get(t.threadId)).not.toBe(
      state.threads.get(t.threadId),
    );
  });

  it('returns true when rejecting a pending event', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      createOptimisticEvent(createThreadOpened()),
    );

    expect(state.reject(pendingId)).toBe(true);
  });

  it('removes a rejected pending thread from the snapshot', () => {
    const state = new ShareState();
    const opened = createThreadOpened();
    const pendingId = state.optimistic(createOptimisticEvent(opened));

    state.reject(pendingId);

    expect(state.getSnapshot().threads.has(opened.threadId)).toBe(false);
  });

  it('returns false when rejecting an unknown pending id', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      createOptimisticEvent(createThreadOpened()),
    );

    state.reject(pendingId);

    expect(state.reject(pendingId)).toBe(false);
  });

  it('leaves the snapshot unchanged when rejecting an unknown pending id', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      createOptimisticEvent(createThreadOpened()),
    );

    state.reject(pendingId);
    const snapshot = state.getSnapshot();
    state.reject(pendingId);

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('returns every pending id from rejectAll', () => {
    const state = new ShareState();
    const t = thread();
    const created = t.comment();

    expect(
      state.optimisticAll([
        createOptimisticEvent(t.opened),
        createOptimisticEvent(created),
      ]),
    ).toHaveLength(2);
  });

  it('clears every pending id with rejectAll', () => {
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    const pendingIds = state.optimisticAll([
      createOptimisticEvent(t.opened),
      createOptimisticEvent(created),
    ]);

    state.rejectAll(pendingIds);

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('returns an empty list for an empty optimistic batch', () => {
    const state = new ShareState();

    expect(state.optimisticAll([])).toEqual([]);
  });

  it('leaves the snapshot unchanged for an empty optimistic batch', () => {
    const state = new ShareState();
    const snapshot = state.getSnapshot();

    state.optimisticAll([]);

    expect(state.getSnapshot()).toBe(snapshot);
  });
});

describe('optimistic deletions', () => {
  it('removes an unconfirmed deletion from the snapshot', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created));

    state.optimistic(createOptimisticEvent(t.deleted(created.commentId)));

    expect(state.getSnapshot().comments.has(created.commentId)).toBe(false);
    expect(state.getSnapshot().deletedCommentIds.has(created.commentId)).toBe(
      true,
    );
  });

  it('marks an unconfirmed deletion as pending', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created));

    state.optimistic(createOptimisticEvent(t.deleted(created.commentId)));

    expect(state.getSnapshot().pendingIds.has(created.commentId)).toBe(true);
  });

  it('leaves confirmed comments in place while a deletion is pending', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created));

    state.optimistic(createOptimisticEvent(t.deleted(created.commentId)));

    expect(state.comments.has(created.commentId)).toBe(true);
    expect(state.deletedCommentIds.has(created.commentId)).toBe(false);
  });

  it('stacks a pending edit and deletion in the snapshot', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment({body: createLexicalBody('v1')});
    state.ingest(log(t.opened, created));

    state.optimistic(createOptimisticEvent(t.edited(created.commentId, 'v2')));
    state.optimistic(createOptimisticEvent(t.deleted(created.commentId)));

    expect(state.getSnapshot().comments.has(created.commentId)).toBe(false);
    expect(state.getSnapshot().deletedCommentIds.has(created.commentId)).toBe(
      true,
    );
    expect(state.getSnapshot().threads.get(t.threadId)?.commentIds).toEqual([]);
  });

  it('leaves confirmed comments unchanged while edits and deletions stack', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment({body: createLexicalBody('v1')});
    state.ingest(log(t.opened, created));

    state.optimistic(createOptimisticEvent(t.edited(created.commentId, 'v2')));
    state.optimistic(createOptimisticEvent(t.deleted(created.commentId)));

    expect(state.comments.get(created.commentId)?.body).toEqual(
      createLexicalBody('v1'),
    );
    expect(state.deletedCommentIds.has(created.commentId)).toBe(false);
  });

  it('refuses to delete a comment twice across pending events', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created));
    state.optimistic(createOptimisticEvent(t.deleted(created.commentId)));

    expect(() =>
      state.optimistic(createOptimisticEvent(t.deleted(created.commentId))),
    ).toThrow(/Comment already deleted/);
  });

  it('refuses to delete a comment the log already deleted', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created, t.deleted(created.commentId)));

    expect(() =>
      state.optimistic(createOptimisticEvent(t.deleted(created.commentId))),
    ).toThrow(/Comment already deleted/);
  });
});

describe('optimistic events building on pending ones', () => {
  it('resolves a thread that only exists optimistically', () => {
    const state = new ShareState();
    const t = thread();
    state.optimistic(createOptimisticEvent(t.opened));

    state.optimistic(createOptimisticEvent(t.resolved()));

    expect(state.getSnapshot().threads.get(t.threadId)?.resolved).toBe(true);
  });

  it('refuses to resolve an optimistically resolved thread again', () => {
    const state = new ShareState();
    const t = thread();
    state.optimistic(createOptimisticEvent(t.opened));
    state.optimistic(createOptimisticEvent(t.resolved()));

    expect(() => state.optimistic(createOptimisticEvent(t.resolved()))).toThrow(
      /Thread already resolved/,
    );
  });

  it('edits a comment that only exists optimistically', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment({body: createLexicalBody('v1')});
    state.ingest(log(t.opened));
    state.optimistic(createOptimisticEvent(created));

    state.optimistic(createOptimisticEvent(t.edited(created.commentId, 'v2')));

    expect(state.getSnapshot().comments.get(created.commentId)?.body).toEqual(
      createLexicalBody('v2'),
    );
  });

  it('refuses to create the same comment twice', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened));
    state.optimistic(createOptimisticEvent(created));

    expect(() => state.optimistic(createOptimisticEvent(created))).toThrow(
      /Comment already exists/,
    );
  });

  it.each([
    {
      name: 'editing an unknown comment',
      payload: () =>
        createCommentEdited({
          commentId: uuid(),
          body: createLexicalBody('text'),
        }),
      error: /Comment not found/,
    },
    {
      name: 'deleting an unknown comment',
      payload: () =>
        createCommentDeleted({
          commentId: uuid(),
        }),
      error: /Comment not found/,
    },
    {
      name: 'resolving an unknown thread',
      payload: () =>
        createThreadResolved({
          threadId: uuid(),
        }),
      error: /Thread not found/,
    },
  ])('rejects $name', ({payload, error}) => {
    const state = new ShareState();

    expect(() => state.optimistic(createOptimisticEvent(payload()))).toThrow(
      error,
    );
  });
});

describe('reconciliation', () => {
  it('keeps a pending edit before its confirmed twin arrives', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment({body: createLexicalBody('v1')});
    state.ingest(log(t.opened, created));
    state.optimistic(createOptimisticEvent(t.edited(created.commentId, 'v2')));

    expect(state.getSnapshot().pendingIds.has(created.commentId)).toBe(true);
  });

  it('clears pending ids when a confirmed twin arrives', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment({body: createLexicalBody('v1')});
    state.ingest(log(t.opened, created));
    state.optimistic(createOptimisticEvent(t.edited(created.commentId, 'v2')));

    state.ingest(log(t.edited(created.commentId, 'v3')));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('applies the confirmed edit when its twin arrives', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment({body: createLexicalBody('v1')});
    state.ingest(log(t.opened, created));
    state.optimistic(createOptimisticEvent(t.edited(created.commentId, 'v2')));

    state.ingest(log(t.edited(created.commentId, 'v3')));

    expect(state.getSnapshot().comments.get(created.commentId)?.body).toEqual(
      createLexicalBody('v3'),
    );
  });

  it('clears pending ids when thread.opened is confirmed', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const opened = createThreadOpened();
    state.optimistic(createOptimisticEvent(opened));

    state.ingest(log(opened));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('moves a confirmed thread.opened into confirmed state', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const opened = createThreadOpened();
    state.optimistic(createOptimisticEvent(opened));

    state.ingest(log(opened));

    expect(state.threads.has(opened.threadId)).toBe(true);
  });

  it('clears pending ids when thread.resolved is confirmed', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    state.ingest(log(t.opened));
    state.optimistic(createOptimisticEvent(t.resolved()));

    state.ingest(log(t.resolved()));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('marks a thread resolved when thread.resolved is confirmed', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    state.ingest(log(t.opened));
    state.optimistic(createOptimisticEvent(t.resolved()));

    state.ingest(log(t.resolved()));

    expect(state.threads.get(t.threadId)?.resolved).toBe(true);
  });

  it('clears pending ids when comment.created is confirmed', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened));
    state.optimistic(createOptimisticEvent(created));

    state.ingest(log(created));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('moves a confirmed comment.created into confirmed state', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened));
    state.optimistic(createOptimisticEvent(created));

    state.ingest(log(created));

    expect(state.comments.has(created.commentId)).toBe(true);
  });

  it('clears pending ids when comment.deleted is confirmed', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created));
    state.optimistic(createOptimisticEvent(t.deleted(created.commentId)));

    state.ingest(log(t.deleted(created.commentId)));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('removes a confirmed comment when comment.deleted is confirmed', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created));
    state.optimistic(createOptimisticEvent(t.deleted(created.commentId)));

    state.ingest(log(t.deleted(created.commentId)));

    expect(state.comments.has(created.commentId)).toBe(false);
    expect(state.deletedCommentIds.has(created.commentId)).toBe(true);
  });

  it('keeps a pending resolve when another thread is resolved', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const other = thread();
    state.ingest(log(t.opened, other.opened));
    state.optimistic(createOptimisticEvent(t.resolved()));

    state.ingest(log(other.resolved()));

    expect(state.getSnapshot().pendingIds.has(t.threadId)).toBe(true);
  });

  it('applies an optimistic resolve to the snapshot when another thread is resolved', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const other = thread();
    state.ingest(log(t.opened, other.opened));
    state.optimistic(createOptimisticEvent(t.resolved()));

    state.ingest(log(other.resolved()));

    expect(state.getSnapshot().threads.get(t.threadId)?.resolved).toBe(true);
  });

  it('leaves confirmed threads unresolved when another thread is resolved', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const other = thread();
    state.ingest(log(t.opened, other.opened));
    state.optimistic(createOptimisticEvent(t.resolved()));

    state.ingest(log(other.resolved()));

    expect(state.threads.get(t.threadId)?.resolved).toBe(false);
  });

  it('keeps a pending edit when an unrelated event is confirmed', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created));
    state.optimistic(createOptimisticEvent(t.edited(created.commentId, 'v2')));

    state.ingest(log(t.resolved()));

    expect(state.getSnapshot().pendingIds.has(created.commentId)).toBe(true);
  });

  it('keeps an optimistic edit in the snapshot when an unrelated event is confirmed', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created));
    state.optimistic(createOptimisticEvent(t.edited(created.commentId, 'v2')));

    state.ingest(log(t.resolved()));

    expect(state.getSnapshot().comments.get(created.commentId)?.body).toEqual(
      createLexicalBody('v2'),
    );
  });

  it('resolves the thread in the snapshot when an unrelated event is confirmed', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const t = thread();
    const created = t.comment();
    state.ingest(log(t.opened, created));
    state.optimistic(createOptimisticEvent(t.edited(created.commentId, 'v2')));

    state.ingest(log(t.resolved()));

    expect(state.getSnapshot().threads.get(t.threadId)?.resolved).toBe(true);
  });
});

describe('subscribe', () => {
  it('notifies subscribers on commit', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const subscriber = vi.fn();

    state.subscribe(subscriber);
    state.ingest(log(createThreadOpened()));

    expect(subscriber).toHaveBeenCalledExactlyOnceWith();
  });

  it('stops notifying after unsubscribe', () => {
    const log = createShareEventLog();
    const state = new ShareState();
    const subscriber = vi.fn();

    const unsubscribe = state.subscribe(subscriber);
    unsubscribe();
    state.ingest(log(createThreadOpened()));

    expect(subscriber).not.toHaveBeenCalled();
  });
});

describe('isType', () => {
  it('returns true for a matching payload', () => {
    const payload = createCommentCreated();

    expect(isType('comment.created', payload)).toBe(true);
  });

  it('returns false for a non-matching payload', () => {
    const payload = createCommentCreated();

    expect(isType('thread.opened', payload)).toBe(false);
  });

  it('narrows a matching payload to the requested variant', () => {
    const payload: ShareEventPayload = createCommentCreated();

    if (!isType('comment.created', payload)) {
      throw new Error('Expected comment.created payload');
    }

    expect(payload.$type).toBe('comment.created');
    expectTypeOf(payload).toEqualTypeOf<CommentCreatedPayload>();
  });

  it('preserves payload fields after narrowing', () => {
    const payload: ShareEventPayload = createCommentCreated();

    if (!isType('comment.created', payload)) {
      throw new Error('Expected comment.created payload');
    }

    expect(payload.commentId).toEqual(expect.any(String));
  });
});

describe('foldEvents', () => {
  it('folds thread state from a log in one call', () => {
    const t = thread();
    const created = t.comment();
    const snapshot = foldEvents(
      createShareEventLog()(t.opened, created, t.resolved()),
    );

    expect(snapshot.threads.get(t.threadId)).toMatchObject({
      resolved: true,
      commentIds: [created.commentId],
    });
  });

  it('drops deleted comments from folded thread state', () => {
    const t = thread();
    const created = t.comment();
    const snapshot = foldEvents(
      createShareEventLog()(
        t.opened,
        created,
        t.deleted(created.commentId),
        t.resolved(),
      ),
    );

    expect(snapshot.comments.has(created.commentId)).toBe(false);
    expect(snapshot.deletedCommentIds.has(created.commentId)).toBe(true);
    expect(snapshot.threads.get(t.threadId)).toMatchObject({
      resolved: true,
      commentIds: [],
    });
  });

  it('returns no pending ids from a folded log', () => {
    const t = thread();
    const created = t.comment();
    const snapshot = foldEvents(
      createShareEventLog()(t.opened, created, t.resolved()),
    );

    expect(snapshot.pendingIds.size).toBe(0);
  });
});
