import type {SerializedEditorState} from 'lexical';
import {describe, expect, expectTypeOf, it, vi} from 'vitest';

import {assert} from '@/utils/assert';
import {FIXTURE} from '@/fixtures/fixture';
import {
  type Anchor,
  type CommentCreatedPayload,
  type ShareEvent,
  type ShareEventPayload,
  subjectIdFromPayload,
} from './schemas';
import {
  foldEvents,
  isType,
  type OptimisticEvent,
  ShareState,
} from './share-state';

function anchor(line = 1) {
  return {
    shareId: FIXTURE.share.id,
    filePath: 'src/a.ts',
    side: 'additions',
    line,
  } satisfies Anchor;
}

function body(text: string) {
  return {text} as unknown as SerializedEditorState;
}

function opened(threadId: string, line = 1) {
  return {
    $type: 'thread.opened',
    threadId,
    anchor: anchor(line),
  } satisfies ShareEventPayload;
}

function resolved(threadId: string) {
  return {
    $type: 'thread.resolved',
    threadId,
  } satisfies ShareEventPayload;
}

function created(threadId: string, commentId: string, text = 'value') {
  return {
    $type: 'comment.created',
    threadId,
    commentId,
    body: body(text),
  } satisfies ShareEventPayload;
}

function edited(commentId: string, text: string) {
  return {
    $type: 'comment.edited',
    commentId,
    body: body(text),
  } satisfies ShareEventPayload;
}

function removed(commentId: string) {
  return {
    $type: 'comment.deleted',
    commentId,
  } satisfies ShareEventPayload;
}

function optimisticEvent(payload: ShareEventPayload) {
  return {
    actorId: FIXTURE.actor.id,
    createdAt: FIXTURE.time.created,
    payload,
  } satisfies OptimisticEvent;
}

function eventLog() {
  let seq = 0;

  return (...payloads: readonly ShareEventPayload[]): ShareEvent[] =>
    payloads.map((payload) => {
      seq += 1;
      return {
        id: `event-${seq}`,
        shareId: FIXTURE.share.id,
        seq,
        type: payload.$type,
        subjectId: subjectIdFromPayload(payload),
        actorId: FIXTURE.actor.id,
        payload,
        createdAt: FIXTURE.time.created,
      } satisfies ShareEvent;
    });
}

describe('ingest', () => {
  it('folds a thread from its events', () => {
    const log = eventLog();
    const state = new ShareState();

    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'value'),
        created(FIXTURE.thread.id, FIXTURE.comment.second),
      ),
    );

    expect(state.threads.get(FIXTURE.thread.id)).toMatchObject({
      id: FIXTURE.thread.id,
      actorId: FIXTURE.actor.id,
      resolved: false,
      commentIds: [FIXTURE.comment.id, FIXTURE.comment.second],
    });
  });

  it('folds comments from their events', () => {
    const log = eventLog();
    const state = new ShareState();

    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'value'),
        created(FIXTURE.thread.id, FIXTURE.comment.second),
      ),
    );

    expect(state.comments.get(FIXTURE.comment.id)).toMatchObject({
      threadId: FIXTURE.thread.id,
      body: body('value'),
      deleted: false,
    });
  });

  it('applies comment edits before deletions', () => {
    const log = eventLog();
    const state = new ShareState();

    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );
    state.ingest(
      log(
        edited(FIXTURE.comment.id, 'value-2'),
        removed(FIXTURE.comment.id),
        resolved(FIXTURE.thread.id),
      ),
    );

    expect(state.comments.get(FIXTURE.comment.id)).toMatchObject({
      body: body('value-2'),
      deleted: true,
    });
  });

  it('applies thread resolutions after comment changes', () => {
    const log = eventLog();
    const state = new ShareState();

    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );
    state.ingest(
      log(
        edited(FIXTURE.comment.id, 'value-2'),
        removed(FIXTURE.comment.id),
        resolved(FIXTURE.thread.id),
      ),
    );

    expect(state.threads.get(FIXTURE.thread.id)?.resolved).toBe(true);
  });

  it('reports false when nothing was applied', () => {
    const state = new ShareState();

    expect(state.ingest([])).toBe(false);
  });

  it('reports true when events were applied', () => {
    const log = eventLog();
    const state = new ShareState();

    expect(state.ingest(log(opened(FIXTURE.thread.id)))).toBe(true);
  });

  it('refuses events that do not advance the sequence', () => {
    const state = new ShareState();
    const [first] = eventLog()(opened(FIXTURE.thread.id));

    state.ingest([first!]);

    expect(() => state.ingest([first!])).toThrow(/is not after latest/);
  });
});

describe('ingest invariants', () => {
  it.each([
    {
      name: 'a comment on an unknown thread',
      payloads: [created(FIXTURE.thread.id, FIXTURE.comment.id)],
      error: /Comment on unknown thread/,
    },
    {
      name: 'reopening a thread',
      payloads: [opened(FIXTURE.thread.id), opened(FIXTURE.thread.id)],
      error: /Thread already opened/,
    },
    {
      name: 'editing a deleted comment',
      payloads: [
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
        removed(FIXTURE.comment.id),
        edited(FIXTURE.comment.id, 'value'),
      ],
      error: /Comment already deleted/,
    },
    {
      name: 'resolving a resolved thread',
      payloads: [
        opened(FIXTURE.thread.id),
        resolved(FIXTURE.thread.id),
        resolved(FIXTURE.thread.id),
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
    state.ingest(log(opened(FIXTURE.thread.id)));

    const snapshot = state.getSnapshot();

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('keeps the same reference after a no-op ingest', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));

    const snapshot = state.getSnapshot();
    state.ingest([]);

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('returns a new reference after ingest', () => {
    const log = eventLog();
    const state = new ShareState();

    const before = state.getSnapshot();
    state.ingest(log(opened(FIXTURE.thread.id)));

    expect(state.getSnapshot()).not.toBe(before);
  });

  it('returns a new reference after an optimistic update', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));

    const afterIngest = state.getSnapshot();
    state.optimistic(optimisticEvent(opened(FIXTURE.thread.second)));

    expect(state.getSnapshot()).not.toBe(afterIngest);
  });

  it('bumps the snapshot version after an optimistic update', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));

    const afterIngest = state.getSnapshot();
    state.optimistic(optimisticEvent(opened(FIXTURE.thread.second)));

    expect(state.getSnapshot().version).toBeGreaterThan(afterIngest.version);
  });

  it('exposes the live thread map while nothing is pending', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));

    expect(state.getSnapshot().threads).toBe(state.threads);
  });

  it('exposes the live comment map while nothing is pending', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));

    expect(state.getSnapshot().comments).toBe(state.comments);
  });

  it('reports no pending ids while nothing is pending', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });
});

describe('optimistic', () => {
  it('returns a pending id for an optimistic thread', () => {
    const state = new ShareState();

    expect(
      state.optimistic(optimisticEvent(opened(FIXTURE.thread.id))),
    ).toEqual(expect.any(String));
  });

  it('surfaces an optimistic thread in the snapshot', () => {
    const state = new ShareState();

    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));

    expect(state.getSnapshot().threads.get(FIXTURE.thread.id)).toMatchObject({
      id: FIXTURE.thread.id,
    });
  });

  it('marks an optimistic thread as pending', () => {
    const state = new ShareState();

    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));

    expect(state.getSnapshot().pendingIds.has(FIXTURE.thread.id)).toBe(true);
  });

  it('leaves confirmed threads untouched by optimistic updates', () => {
    const state = new ShareState();

    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));

    expect(state.threads.has(FIXTURE.thread.id)).toBe(false);
  });

  it('accepts a follow-up pending event on an optimistic thread', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));

    expect(() =>
      state.optimistic(
        optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.id)),
      ),
    ).not.toThrow();
  });

  it('surfaces a follow-up pending comment in the snapshot', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));
    state.optimistic(
      optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.id)),
    );

    expect(state.getSnapshot().comments.get(FIXTURE.comment.id)).toMatchObject({
      threadId: FIXTURE.thread.id,
    });
  });

  it('rejects reopening an optimistic thread', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));

    expect(() =>
      state.optimistic(optimisticEvent(opened(FIXTURE.thread.id))),
    ).toThrow(/Thread already opened/);
  });

  it('rejects a comment on an unknown optimistic thread', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));

    expect(() =>
      state.optimistic(
        optimisticEvent(created(FIXTURE.unknown.id, FIXTURE.comment.id)),
      ),
    ).toThrow(/Comment on unknown thread/);
  });

  it('leaves confirmed thread ids untouched by optimistic updates', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'value-1'),
      ),
    );

    state.optimistic(
      optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.second)),
    );
    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'value-2')));

    expect(state.threads.get(FIXTURE.thread.id)?.commentIds).toEqual([
      FIXTURE.comment.id,
    ]);
  });

  it('leaves confirmed comment bodies untouched by optimistic updates', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'value-1'),
      ),
    );

    state.optimistic(
      optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.second)),
    );
    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'value-2')));

    expect(state.comments.get(FIXTURE.comment.id)?.body).toEqual(
      body('value-1'),
    );
  });

  it('surfaces optimistic thread changes only in the snapshot', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'value-1'),
      ),
    );

    state.optimistic(
      optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.second)),
    );
    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'value-2')));

    expect(
      state.getSnapshot().threads.get(FIXTURE.thread.id)?.commentIds,
    ).toEqual([FIXTURE.comment.id, FIXTURE.comment.second]);
  });

  it('surfaces optimistic comment edits only in the snapshot', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'value-1'),
      ),
    );

    state.optimistic(
      optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.second)),
    );
    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'value-2')));

    expect(state.getSnapshot().comments.get(FIXTURE.comment.id)?.body).toEqual(
      body('value-2'),
    );
  });

  it('reuses untouched threads instead of copying them', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id), opened(FIXTURE.thread.second)));

    state.optimistic(optimisticEvent(resolved(FIXTURE.thread.id)));

    expect(state.getSnapshot().threads.get(FIXTURE.thread.second)).toBe(
      state.threads.get(FIXTURE.thread.second),
    );
  });

  it('copies threads that change during optimistic updates', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id), opened(FIXTURE.thread.second)));

    state.optimistic(optimisticEvent(resolved(FIXTURE.thread.id)));

    expect(state.getSnapshot().threads.get(FIXTURE.thread.id)).not.toBe(
      state.threads.get(FIXTURE.thread.id),
    );
  });

  it('returns true when rejecting a pending event', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      optimisticEvent(opened(FIXTURE.thread.id)),
    );

    expect(state.reject(pendingId)).toBe(true);
  });

  it('removes a rejected pending thread from the snapshot', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      optimisticEvent(opened(FIXTURE.thread.id)),
    );

    state.reject(pendingId);

    expect(state.getSnapshot().threads.has(FIXTURE.thread.id)).toBe(false);
  });

  it('returns false when rejecting an unknown pending id', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      optimisticEvent(opened(FIXTURE.thread.id)),
    );

    state.reject(pendingId);

    expect(state.reject(pendingId)).toBe(false);
  });

  it('leaves the snapshot unchanged when rejecting an unknown pending id', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      optimisticEvent(opened(FIXTURE.thread.id)),
    );

    state.reject(pendingId);
    const snapshot = state.getSnapshot();
    state.reject(pendingId);

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('returns every pending id from rejectAll', () => {
    const state = new ShareState();

    expect(
      state.optimisticAll([
        optimisticEvent(opened(FIXTURE.thread.id)),
        optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.id)),
      ]),
    ).toHaveLength(2);
  });

  it('clears every pending id with rejectAll', () => {
    const state = new ShareState();
    const pendingIds = state.optimisticAll([
      optimisticEvent(opened(FIXTURE.thread.id)),
      optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.id)),
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
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );

    state.optimistic(optimisticEvent(removed(FIXTURE.comment.id)));

    expect(state.getSnapshot().comments.get(FIXTURE.comment.id)?.deleted).toBe(
      true,
    );
  });

  it('marks an unconfirmed deletion as pending', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );

    state.optimistic(optimisticEvent(removed(FIXTURE.comment.id)));

    expect(state.getSnapshot().pendingIds.has(FIXTURE.comment.id)).toBe(true);
  });

  it('leaves confirmed comments undeleted in the snapshot', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );

    state.optimistic(optimisticEvent(removed(FIXTURE.comment.id)));

    expect(state.comments.get(FIXTURE.comment.id)?.deleted).toBe(false);
  });

  it('stacks a pending edit and deletion in the snapshot', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'v1'),
      ),
    );

    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'v2')));
    state.optimistic(optimisticEvent(removed(FIXTURE.comment.id)));

    expect(state.getSnapshot().comments.get(FIXTURE.comment.id)).toMatchObject({
      body: body('v2'),
      deleted: true,
    });
  });

  it('leaves confirmed comments unchanged while edits and deletions stack', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'v1'),
      ),
    );

    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'v2')));
    state.optimistic(optimisticEvent(removed(FIXTURE.comment.id)));

    expect(state.comments.get(FIXTURE.comment.id)).toMatchObject({
      body: body('v1'),
      deleted: false,
    });
  });

  it('refuses to delete a comment twice across pending events', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );
    state.optimistic(optimisticEvent(removed(FIXTURE.comment.id)));

    expect(() =>
      state.optimistic(optimisticEvent(removed(FIXTURE.comment.id))),
    ).toThrow(/Comment already deleted/);
  });

  it('refuses to delete a comment the log already deleted', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
        removed(FIXTURE.comment.id),
      ),
    );

    expect(() =>
      state.optimistic(optimisticEvent(removed(FIXTURE.comment.id))),
    ).toThrow(/Comment already deleted/);
  });
});

describe('optimistic events building on pending ones', () => {
  it('resolves a thread that only exists optimistically', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));

    state.optimistic(optimisticEvent(resolved(FIXTURE.thread.id)));

    expect(state.getSnapshot().threads.get(FIXTURE.thread.id)?.resolved).toBe(
      true,
    );
  });

  it('refuses to resolve an optimistically resolved thread again', () => {
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));
    state.optimistic(optimisticEvent(resolved(FIXTURE.thread.id)));

    expect(() =>
      state.optimistic(optimisticEvent(resolved(FIXTURE.thread.id))),
    ).toThrow(/Thread already resolved/);
  });

  it('edits a comment that only exists optimistically', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));
    state.optimistic(
      optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.id, 'v1')),
    );

    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'v2')));

    expect(state.getSnapshot().comments.get(FIXTURE.comment.id)?.body).toEqual(
      body('v2'),
    );
  });

  it('refuses to create the same comment twice', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));
    state.optimistic(
      optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.id)),
    );

    expect(() =>
      state.optimistic(
        optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.id)),
      ),
    ).toThrow(/Comment already created/);
  });

  it.each([
    {
      name: 'editing an unknown comment',
      payload: edited(FIXTURE.unknown.id, 'text'),
      error: /Comment not found/,
    },
    {
      name: 'deleting an unknown comment',
      payload: removed(FIXTURE.unknown.id),
      error: /Comment not found/,
    },
    {
      name: 'resolving an unknown thread',
      payload: resolved(FIXTURE.unknown.id),
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
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'v1'),
      ),
    );
    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'v2')));

    expect(state.getSnapshot().pendingIds.has(FIXTURE.comment.id)).toBe(true);
  });

  it('clears pending ids when a confirmed twin arrives', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'v1'),
      ),
    );
    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'v2')));

    state.ingest(log(edited(FIXTURE.comment.id, 'v3')));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('applies the confirmed edit when its twin arrives', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id, 'v1'),
      ),
    );
    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'v2')));

    state.ingest(log(edited(FIXTURE.comment.id, 'v3')));

    expect(state.getSnapshot().comments.get(FIXTURE.comment.id)?.body).toEqual(
      body('v3'),
    );
  });

  it('clears pending ids when thread.opened is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));

    state.ingest(log(opened(FIXTURE.thread.id)));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('moves a confirmed thread.opened into confirmed state', () => {
    const log = eventLog();
    const state = new ShareState();
    state.optimistic(optimisticEvent(opened(FIXTURE.thread.id)));

    state.ingest(log(opened(FIXTURE.thread.id)));

    expect(state.threads.has(FIXTURE.thread.id)).toBe(true);
  });

  it('clears pending ids when thread.resolved is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));
    state.optimistic(optimisticEvent(resolved(FIXTURE.thread.id)));

    state.ingest(log(resolved(FIXTURE.thread.id)));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('marks a thread resolved when thread.resolved is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));
    state.optimistic(optimisticEvent(resolved(FIXTURE.thread.id)));

    state.ingest(log(resolved(FIXTURE.thread.id)));

    expect(state.threads.get(FIXTURE.thread.id)?.resolved).toBe(true);
  });

  it('clears pending ids when comment.created is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));
    state.optimistic(
      optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.id)),
    );

    state.ingest(log(created(FIXTURE.thread.id, FIXTURE.comment.id)));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('moves a confirmed comment.created into confirmed state', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id)));
    state.optimistic(
      optimisticEvent(created(FIXTURE.thread.id, FIXTURE.comment.id)),
    );

    state.ingest(log(created(FIXTURE.thread.id, FIXTURE.comment.id)));

    expect(state.comments.has(FIXTURE.comment.id)).toBe(true);
  });

  it('clears pending ids when comment.deleted is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );
    state.optimistic(optimisticEvent(removed(FIXTURE.comment.id)));

    state.ingest(log(removed(FIXTURE.comment.id)));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('marks a comment deleted when comment.deleted is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );
    state.optimistic(optimisticEvent(removed(FIXTURE.comment.id)));

    state.ingest(log(removed(FIXTURE.comment.id)));

    expect(state.comments.get(FIXTURE.comment.id)?.deleted).toBe(true);
  });

  it('keeps a pending resolve when another thread is resolved', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id), opened(FIXTURE.thread.second)));
    state.optimistic(optimisticEvent(resolved(FIXTURE.thread.id)));

    state.ingest(log(resolved(FIXTURE.thread.second)));

    expect(state.getSnapshot().pendingIds.has(FIXTURE.thread.id)).toBe(true);
  });

  it('applies an optimistic resolve to the snapshot when another thread is resolved', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id), opened(FIXTURE.thread.second)));
    state.optimistic(optimisticEvent(resolved(FIXTURE.thread.id)));

    state.ingest(log(resolved(FIXTURE.thread.second)));

    expect(state.getSnapshot().threads.get(FIXTURE.thread.id)?.resolved).toBe(
      true,
    );
  });

  it('leaves confirmed threads unresolved when another thread is resolved', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(log(opened(FIXTURE.thread.id), opened(FIXTURE.thread.second)));
    state.optimistic(optimisticEvent(resolved(FIXTURE.thread.id)));

    state.ingest(log(resolved(FIXTURE.thread.second)));

    expect(state.threads.get(FIXTURE.thread.id)?.resolved).toBe(false);
  });

  it('keeps a pending edit when an unrelated event is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );
    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'v2')));

    state.ingest(log(resolved(FIXTURE.thread.id)));

    expect(state.getSnapshot().pendingIds.has(FIXTURE.comment.id)).toBe(true);
  });

  it('keeps an optimistic edit in the snapshot when an unrelated event is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );
    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'v2')));

    state.ingest(log(resolved(FIXTURE.thread.id)));

    expect(state.getSnapshot().comments.get(FIXTURE.comment.id)?.body).toEqual(
      body('v2'),
    );
  });

  it('resolves the thread in the snapshot when an unrelated event is confirmed', () => {
    const log = eventLog();
    const state = new ShareState();
    state.ingest(
      log(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
      ),
    );
    state.optimistic(optimisticEvent(edited(FIXTURE.comment.id, 'v2')));

    state.ingest(log(resolved(FIXTURE.thread.id)));

    expect(state.getSnapshot().threads.get(FIXTURE.thread.id)?.resolved).toBe(
      true,
    );
  });
});

describe('subscribe', () => {
  it('notifies subscribers on commit', () => {
    const log = eventLog();
    const state = new ShareState();
    const subscriber = vi.fn();

    state.subscribe(subscriber);
    state.ingest(log(opened(FIXTURE.thread.id)));

    expect(subscriber).toHaveBeenCalledExactlyOnceWith();
  });

  it('stops notifying after unsubscribe', () => {
    const log = eventLog();
    const state = new ShareState();
    const subscriber = vi.fn();

    const unsubscribe = state.subscribe(subscriber);
    unsubscribe();
    state.ingest(log(opened(FIXTURE.thread.id)));

    expect(subscriber).not.toHaveBeenCalled();
  });
});

describe('isType', () => {
  it('returns true for a matching payload', () => {
    const payload = created(FIXTURE.thread.id, FIXTURE.comment.id);

    expect(isType('comment.created', payload)).toBe(true);
  });

  it('returns false for a non-matching payload', () => {
    const payload = created(FIXTURE.thread.id, FIXTURE.comment.id);

    expect(isType('thread.opened', payload)).toBe(false);
  });

  it('narrows a matching payload to the requested variant', () => {
    const payload: ShareEventPayload = created(
      FIXTURE.thread.id,
      FIXTURE.comment.id,
    );

    assert(
      isType('comment.created', payload),
      'Expected comment.created payload',
    );

    expectTypeOf(payload).toEqualTypeOf<CommentCreatedPayload>();
  });

  it('preserves payload fields after narrowing', () => {
    const payload: ShareEventPayload = created(
      FIXTURE.thread.id,
      FIXTURE.comment.id,
    );

    assert(
      isType('comment.created', payload),
      'Expected comment.created payload',
    );

    expect(payload.commentId).toBe(FIXTURE.comment.id);
  });
});

describe('foldEvents', () => {
  it('folds thread state from a log in one call', () => {
    const snapshot = foldEvents(
      eventLog()(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
        resolved(FIXTURE.thread.id),
      ),
    );

    expect(snapshot.threads.get(FIXTURE.thread.id)).toMatchObject({
      resolved: true,
      commentIds: [FIXTURE.comment.id],
    });
  });

  it('returns no pending ids from a folded log', () => {
    const snapshot = foldEvents(
      eventLog()(
        opened(FIXTURE.thread.id),
        created(FIXTURE.thread.id, FIXTURE.comment.id),
        resolved(FIXTURE.thread.id),
      ),
    );

    expect(snapshot.pendingIds.size).toBe(0);
  });
});
