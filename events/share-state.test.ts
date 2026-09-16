import type {SerializedEditorState} from 'lexical';
import {describe, expect, expectTypeOf, it, vi} from 'vitest';

import {assert} from '@/utils/assert';
import type {
  Anchor,
  CommentCreatedPayload,
  ShareEvent,
  ShareEventPayload,
} from './schemas';
import {foldEvents, isType, ShareState} from './share-state';

const SHARE_ID = 'share-id';
const ACTOR = 'actor-id';
const CREATED_AT = '2026-01-01T00:00:00.000Z';

function anchor(line = 1): Anchor {
  return {shareId: SHARE_ID, filePath: 'src/a.ts', side: 'additions', line};
}

function body(text: string) {
  return {text} as unknown as SerializedEditorState;
}

function opened(threadId: string, line = 1): ShareEventPayload {
  return {$type: 'thread.opened', threadId, anchor: anchor(line)};
}

function resolved(threadId: string): ShareEventPayload {
  return {$type: 'thread.resolved', threadId};
}

function created(
  threadId: string,
  commentId: string,
  text = 'value',
): ShareEventPayload {
  return {$type: 'comment.created', threadId, commentId, body: body(text)};
}

function edited(commentId: string, text: string): ShareEventPayload {
  return {$type: 'comment.edited', commentId, body: body(text)};
}

function removed(commentId: string): ShareEventPayload {
  return {$type: 'comment.deleted', commentId};
}

function optimisticEvent(payload: ShareEventPayload) {
  return {actorId: ACTOR, createdAt: CREATED_AT, payload};
}

function eventLog() {
  let seq = 0;

  return (...payloads: readonly ShareEventPayload[]): ShareEvent[] =>
    payloads.map((payload) => {
      seq += 1;
      return {
        id: `event-${seq}`,
        shareId: SHARE_ID,
        seq,
        type: payload.$type,
        subjectId: 'threadId' in payload ? payload.threadId : payload.commentId,
        actorId: ACTOR,
        payload,
        createdAt: CREATED_AT,
      };
    });
}

describe('ingest', () => {
  it('folds a thread from its events', () => {
    const log = eventLog();
    const state = new ShareState();

    state.ingest(
      log(
        opened('thread-1'),
        created('thread-1', 'comment-1', 'value'),
        created('thread-1', 'comment-2'),
      ),
    );

    expect(state.threads.get('thread-1')).toMatchObject({
      id: 'thread-1',
      actorId: ACTOR,
      resolved: false,
      commentIds: ['comment-1', 'comment-2'],
    });
  });

  it('folds comments from their events', () => {
    const log = eventLog();
    const state = new ShareState();

    state.ingest(
      log(
        opened('thread-1'),
        created('thread-1', 'comment-1', 'value'),
        created('thread-1', 'comment-2'),
      ),
    );

    expect(state.comments.get('comment-1')).toMatchObject({
      threadId: 'thread-1',
      body: body('value'),
      deleted: false,
    });
  });

  it('applies comment edits before deletions', () => {
    const log = eventLog();
    const state = new ShareState();

    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));
    state.ingest(
      log(
        edited('comment-1', 'value-2'),
        removed('comment-1'),
        resolved('thread-1'),
      ),
    );

    expect(state.comments.get('comment-1')).toMatchObject({
      body: body('value-2'),
      deleted: true,
    });
  });

  it('applies thread resolutions after comment changes', () => {
    const log = eventLog();
    const state = new ShareState();

    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));
    state.ingest(
      log(
        edited('comment-1', 'value-2'),
        removed('comment-1'),
        resolved('thread-1'),
      ),
    );

    expect(state.threads.get('thread-1')?.resolved).toBe(true);
  });

  it('reports false when nothing was applied', () => {
    const state = new ShareState();

    expect(state.ingest([])).toBe(false);
  });

  it('reports true when events were applied', () => {
    const log = eventLog();
    const state = new ShareState();

    expect(state.ingest(log(opened('thread-1')))).toBe(true);
  });

  it('refuses events that do not advance the sequence', () => {
    const state = new ShareState();
    const [first] = eventLog()(opened('thread-1'));

    state.ingest([first!]);

    expect(() => state.ingest([first!])).toThrow(/is not after latest/);
  });
});

describe('ingest invariants', () => {
  it.each([
    {
      name: 'a comment on an unknown thread',
      payloads: [created('thread-1', 'comment-1')],
      error: /Comment on unknown thread/,
    },
    {
      name: 'reopening a thread',
      payloads: [opened('thread-1'), opened('thread-1')],
      error: /Thread already opened/,
    },
    {
      name: 'editing a deleted comment',
      payloads: [
        opened('thread-1'),
        created('thread-1', 'comment-1'),
        removed('comment-1'),
        edited('comment-1', 'value'),
      ],
      error: /Comment already deleted/,
    },
    {
      name: 'resolving a resolved thread',
      payloads: [
        opened('thread-1'),
        resolved('thread-1'),
        resolved('thread-1'),
      ],
      error: /Thread already resolved/,
    },
  ])('rejects $name', ({payloads, error}) => {
    const log = eventLog();
    const state = new ShareState();

    expect(() => state.ingest(log(...payloads))).toThrow(error);
  });
});

describe('getSnapshot', () => {
  it('keeps returning the same reference until something changes', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));

    const snapshot = state.getSnapshot();

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('keeps the same reference after a no-op ingest', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));

    const snapshot = state.getSnapshot();
    state.ingest([]);

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('returns a new reference after ingest', () => {
    const log = eventLog();
    const state = new ShareState();

    const before = state.getSnapshot();
    state.ingest(log(opened('thread-1')));

    expect(state.getSnapshot()).not.toBe(before);
  });

  it('returns a new reference after an optimistic update', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));

    const afterIngest = state.getSnapshot();
    state.optimistic(optimisticEvent(opened('thread-2')));

    expect(state.getSnapshot()).not.toBe(afterIngest);
  });

  it('bumps the snapshot version after an optimistic update', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));

    const afterIngest = state.getSnapshot();
    state.optimistic(optimisticEvent(opened('thread-2')));

    expect(state.getSnapshot().version).toBeGreaterThan(afterIngest.version);
  });

  it('exposes the live thread map while nothing is pending', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));

    expect(state.getSnapshot().threads).toBe(state.threads);
  });

  it('exposes the live comment map while nothing is pending', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));

    expect(state.getSnapshot().comments).toBe(state.comments);
  });

  it('reports no pending ids while nothing is pending', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });
});

describe('optimistic', () => {
  it('returns a pending id for an optimistic thread', () => {
    const state = new ShareState();

    expect(state.optimistic(optimisticEvent(opened('thread-1')))).toEqual(
      expect.any(String),
    );
  });

  it('surfaces an optimistic thread in the snapshot', () => {
    const state = new ShareState();

    state.optimistic(optimisticEvent(opened('thread-1')));

    expect(state.getSnapshot().threads.get('thread-1')).toMatchObject({
      id: 'thread-1',
    });
  });

  it('marks an optimistic thread as pending', () => {
    const state = new ShareState();

    state.optimistic(optimisticEvent(opened('thread-1')));

    expect(state.getSnapshot().pendingIds.has('thread-1')).toBe(true);
  });

  it('leaves confirmed threads untouched by optimistic updates', () => {
    const state = new ShareState();

    state.optimistic(optimisticEvent(opened('thread-1')));

    expect(state.threads.has('thread-1')).toBe(false);
  });

  it('accepts a follow-up pending event on an optimistic thread', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened('thread-1')));

    expect(() =>
      state.optimistic(optimisticEvent(created('thread-1', 'comment-1'))),
    ).not.toThrow();
  });

  it('surfaces a follow-up pending comment in the snapshot', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened('thread-1')));
    state.optimistic(optimisticEvent(created('thread-1', 'comment-1')));

    expect(state.getSnapshot().comments.get('comment-1')).toMatchObject({
      threadId: 'thread-1',
    });
  });

  it('rejects reopening an optimistic thread', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened('thread-1')));

    expect(() => state.optimistic(optimisticEvent(opened('thread-1')))).toThrow(
      /Thread already opened/,
    );
  });

  it('rejects a comment on an unknown optimistic thread', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened('thread-1')));

    expect(() =>
      state.optimistic(optimisticEvent(created('unknown-id', 'comment-1'))),
    ).toThrow(/Comment on unknown thread/);
  });

  it('leaves confirmed thread ids untouched by optimistic updates', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(opened('thread-1'), created('thread-1', 'comment-1', 'value-1')),
    );

    state.optimistic(optimisticEvent(created('thread-1', 'comment-2')));
    state.optimistic(optimisticEvent(edited('comment-1', 'value-2')));

    expect(state.threads.get('thread-1')?.commentIds).toEqual(['comment-1']);
  });

  it('leaves confirmed comment bodies untouched by optimistic updates', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(opened('thread-1'), created('thread-1', 'comment-1', 'value-1')),
    );

    state.optimistic(optimisticEvent(created('thread-1', 'comment-2')));
    state.optimistic(optimisticEvent(edited('comment-1', 'value-2')));

    expect(state.comments.get('comment-1')?.body).toEqual(body('value-1'));
  });

  it('surfaces optimistic thread changes only in the snapshot', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(opened('thread-1'), created('thread-1', 'comment-1', 'value-1')),
    );

    state.optimistic(optimisticEvent(created('thread-1', 'comment-2')));
    state.optimistic(optimisticEvent(edited('comment-1', 'value-2')));

    expect(state.getSnapshot().threads.get('thread-1')?.commentIds).toEqual([
      'comment-1',
      'comment-2',
    ]);
  });

  it('surfaces optimistic comment edits only in the snapshot', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(opened('thread-1'), created('thread-1', 'comment-1', 'value-1')),
    );

    state.optimistic(optimisticEvent(created('thread-1', 'comment-2')));
    state.optimistic(optimisticEvent(edited('comment-1', 'value-2')));

    expect(state.getSnapshot().comments.get('comment-1')?.body).toEqual(
      body('value-2'),
    );
  });

  it('reuses untouched threads instead of copying them', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), opened('thread-2')));

    state.optimistic(optimisticEvent(resolved('thread-1')));

    expect(state.getSnapshot().threads.get('thread-2')).toBe(
      state.threads.get('thread-2'),
    );
  });

  it('copies threads that change during optimistic updates', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), opened('thread-2')));

    state.optimistic(optimisticEvent(resolved('thread-1')));

    expect(state.getSnapshot().threads.get('thread-1')).not.toBe(
      state.threads.get('thread-1'),
    );
  });

  it('returns true when rejecting a pending event', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(optimisticEvent(opened('thread-1')));

    expect(state.reject(pendingId)).toBe(true);
  });

  it('removes a rejected pending thread from the snapshot', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(optimisticEvent(opened('thread-1')));

    state.reject(pendingId);

    expect(state.getSnapshot().threads.has('thread-1')).toBe(false);
  });

  it('returns false when rejecting an unknown pending id', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(optimisticEvent(opened('thread-1')));

    state.reject(pendingId);

    expect(state.reject(pendingId)).toBe(false);
  });

  it('leaves the snapshot unchanged when rejecting an unknown pending id', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(optimisticEvent(opened('thread-1')));

    state.reject(pendingId);
    const snapshot = state.getSnapshot();
    state.reject(pendingId);

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('returns every pending id from rejectAll', () => {
    const state = new ShareState();

    expect(
      state.optimisticAll([
        optimisticEvent(opened('thread-1')),
        optimisticEvent(created('thread-1', 'comment-1')),
      ]),
    ).toHaveLength(2);
  });

  it('clears every pending id with rejectAll', () => {
    const state = new ShareState();
    const pendingIds = state.optimisticAll([
      optimisticEvent(opened('thread-1')),
      optimisticEvent(created('thread-1', 'comment-1')),
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
  it('marks an unconfirmed deletion in the snapshot', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));

    state.optimistic(optimisticEvent(removed('comment-1')));

    expect(state.getSnapshot().comments.get('comment-1')?.deleted).toBe(true);
  });

  it('marks an unconfirmed deletion as pending', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));

    state.optimistic(optimisticEvent(removed('comment-1')));

    expect(state.getSnapshot().pendingIds.has('comment-1')).toBe(true);
  });

  it('leaves confirmed comments undeleted in the snapshot', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));

    state.optimistic(optimisticEvent(removed('comment-1')));

    expect(state.comments.get('comment-1')?.deleted).toBe(false);
  });

  it('stacks a pending edit and deletion in the snapshot', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(opened('thread-1'), created('thread-1', 'comment-1', 'v1')),
    );

    state.optimistic(optimisticEvent(edited('comment-1', 'v2')));
    state.optimistic(optimisticEvent(removed('comment-1')));

    expect(state.getSnapshot().comments.get('comment-1')).toMatchObject({
      body: body('v2'),
      deleted: true,
    });
  });

  it('leaves confirmed comments unchanged while edits and deletions stack', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(opened('thread-1'), created('thread-1', 'comment-1', 'v1')),
    );

    state.optimistic(optimisticEvent(edited('comment-1', 'v2')));
    state.optimistic(optimisticEvent(removed('comment-1')));

    expect(state.comments.get('comment-1')).toMatchObject({
      body: body('v1'),
      deleted: false,
    });
  });

  it('refuses to delete a comment twice across pending events', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));
    state.optimistic(optimisticEvent(removed('comment-1')));

    expect(() =>
      state.optimistic(optimisticEvent(removed('comment-1'))),
    ).toThrow(/Comment already deleted/);
  });

  it('refuses to delete a comment the log already deleted', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened('thread-1'),
        created('thread-1', 'comment-1'),
        removed('comment-1'),
      ),
    );

    expect(() =>
      state.optimistic(optimisticEvent(removed('comment-1'))),
    ).toThrow(/Comment already deleted/);
  });
});

describe('optimistic events building on pending ones', () => {
  it('resolves a thread that only exists optimistically', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened('thread-1')));

    state.optimistic(optimisticEvent(resolved('thread-1')));

    expect(state.getSnapshot().threads.get('thread-1')?.resolved).toBe(true);
  });

  it('refuses to resolve an optimistically resolved thread again', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened('thread-1')));
    state.optimistic(optimisticEvent(resolved('thread-1')));

    expect(() =>
      state.optimistic(optimisticEvent(resolved('thread-1'))),
    ).toThrow(/Thread already resolved/);
  });

  it('edits a comment that only exists optimistically', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));
    state.optimistic(optimisticEvent(created('thread-1', 'comment-1', 'v1')));

    state.optimistic(optimisticEvent(edited('comment-1', 'v2')));

    expect(state.getSnapshot().comments.get('comment-1')?.body).toEqual(
      body('v2'),
    );
  });

  it('refuses to create the same comment twice', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));
    state.optimistic(optimisticEvent(created('thread-1', 'comment-1')));

    expect(() =>
      state.optimistic(optimisticEvent(created('thread-1', 'comment-1'))),
    ).toThrow(/Comment already created/);
  });

  it.each([
    {
      name: 'editing an unknown comment',
      payload: edited('unknown-id', 'text'),
      error: /Comment not found/,
    },
    {
      name: 'deleting an unknown comment',
      payload: removed('unknown-id'),
      error: /Comment not found/,
    },
    {
      name: 'resolving an unknown thread',
      payload: resolved('unknown-id'),
      error: /Thread not found/,
    },
  ])('rejects $name', ({payload, error}) => {
    const state = new ShareState();

    expect(() => state.optimistic(optimisticEvent(payload))).toThrow(error);
  });
});

describe('reconciliation', () => {
  it('keeps a pending edit before its confirmed twin arrives', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(opened('thread-1'), created('thread-1', 'comment-1', 'v1')),
    );
    state.optimistic(optimisticEvent(edited('comment-1', 'v2')));

    expect(state.getSnapshot().pendingIds.has('comment-1')).toBe(true);
  });

  it('clears pending ids when a confirmed twin arrives', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(opened('thread-1'), created('thread-1', 'comment-1', 'v1')),
    );
    state.optimistic(optimisticEvent(edited('comment-1', 'v2')));

    state.ingest(log(edited('comment-1', 'v3')));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('applies the confirmed edit when its twin arrives', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(opened('thread-1'), created('thread-1', 'comment-1', 'v1')),
    );
    state.optimistic(optimisticEvent(edited('comment-1', 'v2')));

    state.ingest(log(edited('comment-1', 'v3')));

    expect(state.getSnapshot().comments.get('comment-1')?.body).toEqual(
      body('v3'),
    );
  });

  it('clears pending ids when thread.opened is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened('thread-1')));

    state.ingest(log(opened('thread-1')));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('moves a confirmed thread.opened into confirmed state', () => {
    const log = eventLog();
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened('thread-1')));

    state.ingest(log(opened('thread-1')));

    expect(state.threads.has('thread-1')).toBe(true);
  });

  it('clears pending ids when thread.resolved is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));
    state.optimistic(optimisticEvent(resolved('thread-1')));

    state.ingest(log(resolved('thread-1')));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('marks a thread resolved when thread.resolved is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));
    state.optimistic(optimisticEvent(resolved('thread-1')));

    state.ingest(log(resolved('thread-1')));

    expect(state.threads.get('thread-1')?.resolved).toBe(true);
  });

  it('clears pending ids when comment.created is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));
    state.optimistic(optimisticEvent(created('thread-1', 'comment-1')));

    state.ingest(log(created('thread-1', 'comment-1')));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('moves a confirmed comment.created into confirmed state', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1')));
    state.optimistic(optimisticEvent(created('thread-1', 'comment-1')));

    state.ingest(log(created('thread-1', 'comment-1')));

    expect(state.comments.has('comment-1')).toBe(true);
  });

  it('clears pending ids when comment.deleted is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));
    state.optimistic(optimisticEvent(removed('comment-1')));

    state.ingest(log(removed('comment-1')));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('marks a comment deleted when comment.deleted is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));
    state.optimistic(optimisticEvent(removed('comment-1')));

    state.ingest(log(removed('comment-1')));

    expect(state.comments.get('comment-1')?.deleted).toBe(true);
  });

  it('keeps a pending resolve when another thread is resolved', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), opened('thread-2')));
    state.optimistic(optimisticEvent(resolved('thread-1')));

    state.ingest(log(resolved('thread-2')));

    expect(state.getSnapshot().pendingIds.has('thread-1')).toBe(true);
  });

  it('applies an optimistic resolve to the snapshot when another thread is resolved', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), opened('thread-2')));
    state.optimistic(optimisticEvent(resolved('thread-1')));

    state.ingest(log(resolved('thread-2')));

    expect(state.getSnapshot().threads.get('thread-1')?.resolved).toBe(true);
  });

  it('leaves confirmed threads unresolved when another thread is resolved', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), opened('thread-2')));
    state.optimistic(optimisticEvent(resolved('thread-1')));

    state.ingest(log(resolved('thread-2')));

    expect(state.threads.get('thread-1')?.resolved).toBe(false);
  });

  it('keeps a pending edit when an unrelated event is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));
    state.optimistic(optimisticEvent(edited('comment-1', 'v2')));

    state.ingest(log(resolved('thread-1')));

    expect(state.getSnapshot().pendingIds.has('comment-1')).toBe(true);
  });

  it('keeps an optimistic edit in the snapshot when an unrelated event is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));
    state.optimistic(optimisticEvent(edited('comment-1', 'v2')));

    state.ingest(log(resolved('thread-1')));

    expect(state.getSnapshot().comments.get('comment-1')?.body).toEqual(
      body('v2'),
    );
  });

  it('resolves the thread in the snapshot when an unrelated event is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened('thread-1'), created('thread-1', 'comment-1')));
    state.optimistic(optimisticEvent(edited('comment-1', 'v2')));

    state.ingest(log(resolved('thread-1')));

    expect(state.getSnapshot().threads.get('thread-1')?.resolved).toBe(true);
  });
});

describe('subscribe', () => {
  it('notifies subscribers on commit', () => {
    const log = eventLog();
    const state = new ShareState();
    const subscriber = vi.fn();

    state.subscribe(subscriber);
    state.ingest(log(opened('thread-1')));

    expect(subscriber).toHaveBeenCalledExactlyOnceWith();
  });

  it('stops notifying after unsubscribe', () => {
    const log = eventLog();
    const state = new ShareState();
    const subscriber = vi.fn();

    const unsubscribe = state.subscribe(subscriber);
    unsubscribe();
    state.ingest(log(opened('thread-1')));

    expect(subscriber).not.toHaveBeenCalled();
  });
});

describe('isType', () => {
  it('returns true for a matching payload', () => {
    const payload = created('thread-1', 'comment-1');

    expect(isType('comment.created', payload)).toBe(true);
  });

  it('returns false for a non-matching payload', () => {
    const payload = created('thread-1', 'comment-1');

    expect(isType('thread.opened', payload)).toBe(false);
  });

  it('narrows a matching payload to the requested variant', () => {
    const payload: ShareEventPayload = created('thread-1', 'comment-1');

    assert(
      isType('comment.created', payload),
      'Expected comment.created payload',
    );

    expectTypeOf(payload).toEqualTypeOf<CommentCreatedPayload>();
  });

  it('preserves payload fields after narrowing', () => {
    const payload: ShareEventPayload = created('thread-1', 'comment-1');

    assert(
      isType('comment.created', payload),
      'Expected comment.created payload',
    );

    expect(payload.commentId).toBe('comment-1');
  });
});

describe('foldEvents', () => {
  it('folds thread state from a log in one call', () => {
    const snapshot = foldEvents(
      eventLog()(
        opened('thread-1'),
        created('thread-1', 'comment-1'),
        resolved('thread-1'),
      ),
    );

    expect(snapshot.threads.get('thread-1')).toMatchObject({
      resolved: true,
      commentIds: ['comment-1'],
    });
  });

  it('returns no pending ids from a folded log', () => {
    const snapshot = foldEvents(
      eventLog()(
        opened('thread-1'),
        created('thread-1', 'comment-1'),
        resolved('thread-1'),
      ),
    );

    expect(snapshot.pendingIds.size).toBe(0);
  });
});
