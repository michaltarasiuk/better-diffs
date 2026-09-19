import {describe, expect, expectTypeOf, it, vi} from 'vitest';

import {assert} from '@/utils/assert';
import {
  createCommentCreated,
  createCommentDeleted,
  createCommentEdited,
  createEventLog,
  createLexicalBody,
  createOptimisticEvent,
  createThreadOpened,
  createThreadResolved,
} from '@/testing/factories/events';
import {
  COMMENT_ID,
  COMMENT_ID_SECONDARY,
  MISSING_ID,
  THREAD_ID,
  THREAD_ID_SECONDARY,
  USER_ID,
} from '@/testing/ids';
import type {CommentCreatedPayload, ShareEventPayload} from './schemas';
import {foldEvents, isType, ShareState} from './share-state';

describe('ingest', () => {
  it('folds a thread from its events', () => {
    const log = createEventLog();
    const state = new ShareState();

    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('value'),
        }),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID_SECONDARY,
        }),
      ),
    );

    expect(state.threads.get(THREAD_ID)).toMatchObject({
      id: THREAD_ID,
      actorId: USER_ID,
      resolved: false,
      commentIds: [COMMENT_ID, COMMENT_ID_SECONDARY],
    });
  });

  it('folds comments from their events', () => {
    const log = createEventLog();
    const state = new ShareState();

    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('value'),
        }),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID_SECONDARY,
        }),
      ),
    );

    expect(state.comments.get(COMMENT_ID)).toMatchObject({
      threadId: THREAD_ID,
      body: createLexicalBody('value'),
      deleted: false,
    });
  });

  it('applies comment edits before deletions', () => {
    const log = createEventLog();
    const state = new ShareState();

    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );
    state.ingest(
      log(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('value-2'),
        }),
        createCommentDeleted({commentId: COMMENT_ID}),
        createThreadResolved({threadId: THREAD_ID}),
      ),
    );

    expect(state.comments.get(COMMENT_ID)).toMatchObject({
      body: createLexicalBody('value-2'),
      deleted: true,
    });
  });

  it('applies thread resolutions after comment changes', () => {
    const log = createEventLog();
    const state = new ShareState();

    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );
    state.ingest(
      log(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('value-2'),
        }),
        createCommentDeleted({commentId: COMMENT_ID}),
        createThreadResolved({threadId: THREAD_ID}),
      ),
    );

    expect(state.threads.get(THREAD_ID)?.resolved).toBe(true);
  });

  it('reports false when nothing was applied', () => {
    const state = new ShareState();

    expect(state.ingest([])).toBe(false);
  });

  it('reports true when events were applied', () => {
    const log = createEventLog();
    const state = new ShareState();

    expect(state.ingest(log(createThreadOpened({threadId: THREAD_ID})))).toBe(
      true,
    );
  });

  it('refuses events that do not advance the sequence', () => {
    const state = new ShareState();
    const [first] = createEventLog()(createThreadOpened({threadId: THREAD_ID}));

    state.ingest([first!]);

    expect(() => state.ingest([first!])).toThrow(/is not after latest/);
  });
});

describe('ingest invariants', () => {
  it.each([
    {
      name: 'a comment on an unknown thread',
      payloads: [
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ],
      error: /Comment on unknown thread/,
    },
    {
      name: 'reopening a thread',
      payloads: [
        createThreadOpened({threadId: THREAD_ID}),
        createThreadOpened({threadId: THREAD_ID}),
      ],
      error: /Thread already opened/,
    },
    {
      name: 'editing a deleted comment',
      payloads: [
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
        createCommentDeleted({commentId: COMMENT_ID}),
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('value'),
        }),
      ],
      error: /Comment already deleted/,
    },
    {
      name: 'resolving a resolved thread',
      payloads: [
        createThreadOpened({threadId: THREAD_ID}),
        createThreadResolved({threadId: THREAD_ID}),
        createThreadResolved({threadId: THREAD_ID}),
      ],
      error: /Thread already resolved/,
    },
  ])('rejects $name', ({payloads, error}) => {
    const log = createEventLog();
    const state = new ShareState();

    expect(() => state.ingest(log(...payloads))).toThrow(error);
  });
});

describe('getSnapshot', () => {
  it('keeps returning the same reference until something changes', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    const snapshot = state.getSnapshot();

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('keeps the same reference after a no-op ingest', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    const snapshot = state.getSnapshot();
    state.ingest([]);

    expect(state.getSnapshot()).toBe(snapshot);
  });

  it('returns a new reference after ingest', () => {
    const log = createEventLog();
    const state = new ShareState();

    const before = state.getSnapshot();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    expect(state.getSnapshot()).not.toBe(before);
  });

  it('returns a new reference after an optimistic update', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    const afterIngest = state.getSnapshot();
    state.optimistic(
      createOptimisticEvent(
        createThreadOpened({threadId: THREAD_ID_SECONDARY}),
      ),
    );

    expect(state.getSnapshot()).not.toBe(afterIngest);
  });

  it('bumps the snapshot version after an optimistic update', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    const afterIngest = state.getSnapshot();
    state.optimistic(
      createOptimisticEvent(
        createThreadOpened({threadId: THREAD_ID_SECONDARY}),
      ),
    );

    expect(state.getSnapshot().version).toBeGreaterThan(afterIngest.version);
  });

  it('exposes the live thread map while nothing is pending', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    expect(state.getSnapshot().threads).toBe(state.threads);
  });

  it('exposes the live comment map while nothing is pending', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    expect(state.getSnapshot().comments).toBe(state.comments);
  });

  it('reports no pending ids while nothing is pending', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });
});

describe('optimistic', () => {
  it('returns a pending id for an optimistic thread', () => {
    const state = new ShareState();

    expect(
      state.optimistic(
        createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
      ),
    ).toEqual(expect.any(String));
  });

  it('surfaces an optimistic thread in the snapshot', () => {
    const state = new ShareState();

    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    expect(state.getSnapshot().threads.get(THREAD_ID)).toMatchObject({
      id: THREAD_ID,
    });
  });

  it('marks an optimistic thread as pending', () => {
    const state = new ShareState();

    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    expect(state.getSnapshot().pendingIds.has(THREAD_ID)).toBe(true);
  });

  it('leaves confirmed threads untouched by optimistic updates', () => {
    const state = new ShareState();

    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    expect(state.threads.has(THREAD_ID)).toBe(false);
  });

  it('accepts a follow-up pending event on an optimistic thread', () => {
    const state = new ShareState();
    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    expect(() =>
      state.optimistic(
        createOptimisticEvent(
          createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
        ),
      ),
    ).not.toThrow();
  });

  it('surfaces a follow-up pending comment in the snapshot', () => {
    const state = new ShareState();
    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );

    expect(state.getSnapshot().comments.get(COMMENT_ID)).toMatchObject({
      threadId: THREAD_ID,
    });
  });

  it('rejects reopening an optimistic thread', () => {
    const state = new ShareState();
    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    expect(() =>
      state.optimistic(
        createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
      ),
    ).toThrow(/Thread already opened/);
  });

  it('rejects a comment on an unknown optimistic thread', () => {
    const state = new ShareState();
    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    expect(() =>
      state.optimistic(
        createOptimisticEvent(
          createCommentCreated({threadId: MISSING_ID, commentId: COMMENT_ID}),
        ),
      ),
    ).toThrow(/Comment on unknown thread/);
  });

  it('leaves confirmed thread ids untouched by optimistic updates', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('value-1'),
        }),
      ),
    );

    state.optimistic(
      createOptimisticEvent(
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID_SECONDARY,
        }),
      ),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('value-2'),
        }),
      ),
    );

    expect(state.threads.get(THREAD_ID)?.commentIds).toEqual([COMMENT_ID]);
  });

  it('leaves confirmed comment bodies untouched by optimistic updates', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('value-1'),
        }),
      ),
    );

    state.optimistic(
      createOptimisticEvent(
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID_SECONDARY,
        }),
      ),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('value-2'),
        }),
      ),
    );

    expect(state.comments.get(COMMENT_ID)?.body).toEqual(
      createLexicalBody('value-1'),
    );
  });

  it('surfaces optimistic thread changes only in the snapshot', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('value-1'),
        }),
      ),
    );

    state.optimistic(
      createOptimisticEvent(
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID_SECONDARY,
        }),
      ),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('value-2'),
        }),
      ),
    );

    expect(state.getSnapshot().threads.get(THREAD_ID)?.commentIds).toEqual([
      COMMENT_ID,
      COMMENT_ID_SECONDARY,
    ]);
  });

  it('surfaces optimistic comment edits only in the snapshot', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('value-1'),
        }),
      ),
    );

    state.optimistic(
      createOptimisticEvent(
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID_SECONDARY,
        }),
      ),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('value-2'),
        }),
      ),
    );

    expect(state.getSnapshot().comments.get(COMMENT_ID)?.body).toEqual(
      createLexicalBody('value-2'),
    );
  });

  it('reuses untouched threads instead of copying them', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createThreadOpened({threadId: THREAD_ID_SECONDARY}),
      ),
    );

    state.optimistic(
      createOptimisticEvent(createThreadResolved({threadId: THREAD_ID})),
    );

    expect(state.getSnapshot().threads.get(THREAD_ID_SECONDARY)).toBe(
      state.threads.get(THREAD_ID_SECONDARY),
    );
  });

  it('copies threads that change during optimistic updates', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createThreadOpened({threadId: THREAD_ID_SECONDARY}),
      ),
    );

    state.optimistic(
      createOptimisticEvent(createThreadResolved({threadId: THREAD_ID})),
    );

    expect(state.getSnapshot().threads.get(THREAD_ID)).not.toBe(
      state.threads.get(THREAD_ID),
    );
  });

  it('returns true when rejecting a pending event', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    expect(state.reject(pendingId)).toBe(true);
  });

  it('removes a rejected pending thread from the snapshot', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    state.reject(pendingId);

    expect(state.getSnapshot().threads.has(THREAD_ID)).toBe(false);
  });

  it('returns false when rejecting an unknown pending id', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    state.reject(pendingId);

    expect(state.reject(pendingId)).toBe(false);
  });

  it('leaves the snapshot unchanged when rejecting an unknown pending id', () => {
    const state = new ShareState();
    const pendingId = state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
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
        createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
        createOptimisticEvent(
          createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
        ),
      ]),
    ).toHaveLength(2);
  });

  it('clears every pending id with rejectAll', () => {
    const state = new ShareState();
    const pendingIds = state.optimisticAll([
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
      createOptimisticEvent(
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
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
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );

    state.optimistic(
      createOptimisticEvent(createCommentDeleted({commentId: COMMENT_ID})),
    );

    expect(state.getSnapshot().comments.get(COMMENT_ID)?.deleted).toBe(true);
  });

  it('marks an unconfirmed deletion as pending', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );

    state.optimistic(
      createOptimisticEvent(createCommentDeleted({commentId: COMMENT_ID})),
    );

    expect(state.getSnapshot().pendingIds.has(COMMENT_ID)).toBe(true);
  });

  it('leaves confirmed comments undeleted in the snapshot', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );

    state.optimistic(
      createOptimisticEvent(createCommentDeleted({commentId: COMMENT_ID})),
    );

    expect(state.comments.get(COMMENT_ID)?.deleted).toBe(false);
  });

  it('stacks a pending edit and deletion in the snapshot', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('v1'),
        }),
      ),
    );

    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v2'),
        }),
      ),
    );
    state.optimistic(
      createOptimisticEvent(createCommentDeleted({commentId: COMMENT_ID})),
    );

    expect(state.getSnapshot().comments.get(COMMENT_ID)).toMatchObject({
      body: createLexicalBody('v2'),
      deleted: true,
    });
  });

  it('leaves confirmed comments unchanged while edits and deletions stack', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('v1'),
        }),
      ),
    );

    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v2'),
        }),
      ),
    );
    state.optimistic(
      createOptimisticEvent(createCommentDeleted({commentId: COMMENT_ID})),
    );

    expect(state.comments.get(COMMENT_ID)).toMatchObject({
      body: createLexicalBody('v1'),
      deleted: false,
    });
  });

  it('refuses to delete a comment twice across pending events', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );
    state.optimistic(
      createOptimisticEvent(createCommentDeleted({commentId: COMMENT_ID})),
    );

    expect(() =>
      state.optimistic(
        createOptimisticEvent(createCommentDeleted({commentId: COMMENT_ID})),
      ),
    ).toThrow(/Comment already deleted/);
  });

  it('refuses to delete a comment the log already deleted', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
        createCommentDeleted({commentId: COMMENT_ID}),
      ),
    );

    expect(() =>
      state.optimistic(
        createOptimisticEvent(createCommentDeleted({commentId: COMMENT_ID})),
      ),
    ).toThrow(/Comment already deleted/);
  });
});

describe('optimistic events building on pending ones', () => {
  it('resolves a thread that only exists optimistically', () => {
    const state = new ShareState();
    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    state.optimistic(
      createOptimisticEvent(createThreadResolved({threadId: THREAD_ID})),
    );

    expect(state.getSnapshot().threads.get(THREAD_ID)?.resolved).toBe(true);
  });

  it('refuses to resolve an optimistically resolved thread again', () => {
    const state = new ShareState();
    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );
    state.optimistic(
      createOptimisticEvent(createThreadResolved({threadId: THREAD_ID})),
    );

    expect(() =>
      state.optimistic(
        createOptimisticEvent(createThreadResolved({threadId: THREAD_ID})),
      ),
    ).toThrow(/Thread already resolved/);
  });

  it('edits a comment that only exists optimistically', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));
    state.optimistic(
      createOptimisticEvent(
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('v1'),
        }),
      ),
    );

    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v2'),
        }),
      ),
    );

    expect(state.getSnapshot().comments.get(COMMENT_ID)?.body).toEqual(
      createLexicalBody('v2'),
    );
  });

  it('refuses to create the same comment twice', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));
    state.optimistic(
      createOptimisticEvent(
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );

    expect(() =>
      state.optimistic(
        createOptimisticEvent(
          createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
        ),
      ),
    ).toThrow(/Comment already created/);
  });

  it.each([
    {
      name: 'editing an unknown comment',
      payload: createCommentEdited({
        commentId: MISSING_ID,
        body: createLexicalBody('text'),
      }),
      error: /Comment not found/,
    },
    {
      name: 'deleting an unknown comment',
      payload: createCommentDeleted({commentId: MISSING_ID}),
      error: /Comment not found/,
    },
    {
      name: 'resolving an unknown thread',
      payload: createThreadResolved({threadId: MISSING_ID}),
      error: /Thread not found/,
    },
  ])('rejects $name', ({payload, error}) => {
    const state = new ShareState();

    expect(() => state.optimistic(createOptimisticEvent(payload))).toThrow(
      error,
    );
  });
});

describe('reconciliation', () => {
  it('keeps a pending edit before its confirmed twin arrives', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('v1'),
        }),
      ),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v2'),
        }),
      ),
    );

    expect(state.getSnapshot().pendingIds.has(COMMENT_ID)).toBe(true);
  });

  it('clears pending ids when a confirmed twin arrives', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('v1'),
        }),
      ),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v2'),
        }),
      ),
    );

    state.ingest(
      log(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v3'),
        }),
      ),
    );

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('applies the confirmed edit when its twin arrives', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({
          threadId: THREAD_ID,
          commentId: COMMENT_ID,
          body: createLexicalBody('v1'),
        }),
      ),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v2'),
        }),
      ),
    );

    state.ingest(
      log(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v3'),
        }),
      ),
    );

    expect(state.getSnapshot().comments.get(COMMENT_ID)?.body).toEqual(
      createLexicalBody('v3'),
    );
  });

  it('clears pending ids when thread.opened is confirmed', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('moves a confirmed thread.opened into confirmed state', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.optimistic(
      createOptimisticEvent(createThreadOpened({threadId: THREAD_ID})),
    );

    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    expect(state.threads.has(THREAD_ID)).toBe(true);
  });

  it('clears pending ids when thread.resolved is confirmed', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));
    state.optimistic(
      createOptimisticEvent(createThreadResolved({threadId: THREAD_ID})),
    );

    state.ingest(log(createThreadResolved({threadId: THREAD_ID})));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('marks a thread resolved when thread.resolved is confirmed', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));
    state.optimistic(
      createOptimisticEvent(createThreadResolved({threadId: THREAD_ID})),
    );

    state.ingest(log(createThreadResolved({threadId: THREAD_ID})));

    expect(state.threads.get(THREAD_ID)?.resolved).toBe(true);
  });

  it('clears pending ids when comment.created is confirmed', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));
    state.optimistic(
      createOptimisticEvent(
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );

    state.ingest(
      log(createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID})),
    );

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('moves a confirmed comment.created into confirmed state', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));
    state.optimistic(
      createOptimisticEvent(
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );

    state.ingest(
      log(createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID})),
    );

    expect(state.comments.has(COMMENT_ID)).toBe(true);
  });

  it('clears pending ids when comment.deleted is confirmed', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );
    state.optimistic(
      createOptimisticEvent(createCommentDeleted({commentId: COMMENT_ID})),
    );

    state.ingest(log(createCommentDeleted({commentId: COMMENT_ID})));

    expect(state.getSnapshot().pendingIds.size).toBe(0);
  });

  it('marks a comment deleted when comment.deleted is confirmed', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );
    state.optimistic(
      createOptimisticEvent(createCommentDeleted({commentId: COMMENT_ID})),
    );

    state.ingest(log(createCommentDeleted({commentId: COMMENT_ID})));

    expect(state.comments.get(COMMENT_ID)?.deleted).toBe(true);
  });

  it('keeps a pending resolve when another thread is resolved', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createThreadOpened({threadId: THREAD_ID_SECONDARY}),
      ),
    );
    state.optimistic(
      createOptimisticEvent(createThreadResolved({threadId: THREAD_ID})),
    );

    state.ingest(log(createThreadResolved({threadId: THREAD_ID_SECONDARY})));

    expect(state.getSnapshot().pendingIds.has(THREAD_ID)).toBe(true);
  });

  it('applies an optimistic resolve to the snapshot when another thread is resolved', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createThreadOpened({threadId: THREAD_ID_SECONDARY}),
      ),
    );
    state.optimistic(
      createOptimisticEvent(createThreadResolved({threadId: THREAD_ID})),
    );

    state.ingest(log(createThreadResolved({threadId: THREAD_ID_SECONDARY})));

    expect(state.getSnapshot().threads.get(THREAD_ID)?.resolved).toBe(true);
  });

  it('leaves confirmed threads unresolved when another thread is resolved', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createThreadOpened({threadId: THREAD_ID_SECONDARY}),
      ),
    );
    state.optimistic(
      createOptimisticEvent(createThreadResolved({threadId: THREAD_ID})),
    );

    state.ingest(log(createThreadResolved({threadId: THREAD_ID_SECONDARY})));

    expect(state.threads.get(THREAD_ID)?.resolved).toBe(false);
  });

  it('keeps a pending edit when an unrelated event is confirmed', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v2'),
        }),
      ),
    );

    state.ingest(log(createThreadResolved({threadId: THREAD_ID})));

    expect(state.getSnapshot().pendingIds.has(COMMENT_ID)).toBe(true);
  });

  it('keeps an optimistic edit in the snapshot when an unrelated event is confirmed', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v2'),
        }),
      ),
    );

    state.ingest(log(createThreadResolved({threadId: THREAD_ID})));

    expect(state.getSnapshot().comments.get(COMMENT_ID)?.body).toEqual(
      createLexicalBody('v2'),
    );
  });

  it('resolves the thread in the snapshot when an unrelated event is confirmed', () => {
    const log = createEventLog();
    const state = new ShareState();
    state.ingest(
      log(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
      ),
    );
    state.optimistic(
      createOptimisticEvent(
        createCommentEdited({
          commentId: COMMENT_ID,
          body: createLexicalBody('v2'),
        }),
      ),
    );

    state.ingest(log(createThreadResolved({threadId: THREAD_ID})));

    expect(state.getSnapshot().threads.get(THREAD_ID)?.resolved).toBe(true);
  });
});

describe('subscribe', () => {
  it('notifies subscribers on commit', () => {
    const log = createEventLog();
    const state = new ShareState();
    const subscriber = vi.fn();

    state.subscribe(subscriber);
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    expect(subscriber).toHaveBeenCalledExactlyOnceWith();
  });

  it('stops notifying after unsubscribe', () => {
    const log = createEventLog();
    const state = new ShareState();
    const subscriber = vi.fn();

    const unsubscribe = state.subscribe(subscriber);
    unsubscribe();
    state.ingest(log(createThreadOpened({threadId: THREAD_ID})));

    expect(subscriber).not.toHaveBeenCalled();
  });
});

describe('isType', () => {
  it('returns true for a matching payload', () => {
    const payload = createCommentCreated({
      threadId: THREAD_ID,
      commentId: COMMENT_ID,
    });

    expect(isType('comment.created', payload)).toBe(true);
  });

  it('returns false for a non-matching payload', () => {
    const payload = createCommentCreated({
      threadId: THREAD_ID,
      commentId: COMMENT_ID,
    });

    expect(isType('thread.opened', payload)).toBe(false);
  });

  it('narrows a matching payload to the requested variant', () => {
    const payload: ShareEventPayload = createCommentCreated({
      threadId: THREAD_ID,
      commentId: COMMENT_ID,
    });

    assert(
      isType('comment.created', payload),
      'Expected comment.created payload',
    );

    expectTypeOf(payload).toEqualTypeOf<CommentCreatedPayload>();
  });

  it('preserves payload fields after narrowing', () => {
    const payload: ShareEventPayload = createCommentCreated({
      threadId: THREAD_ID,
      commentId: COMMENT_ID,
    });

    assert(
      isType('comment.created', payload),
      'Expected comment.created payload',
    );

    expect(payload.commentId).toBe(COMMENT_ID);
  });
});

describe('foldEvents', () => {
  it('folds thread state from a log in one call', () => {
    const snapshot = foldEvents(
      createEventLog()(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
        createThreadResolved({threadId: THREAD_ID}),
      ),
    );

    expect(snapshot.threads.get(THREAD_ID)).toMatchObject({
      resolved: true,
      commentIds: [COMMENT_ID],
    });
  });

  it('returns no pending ids from a folded log', () => {
    const snapshot = foldEvents(
      createEventLog()(
        createThreadOpened({threadId: THREAD_ID}),
        createCommentCreated({threadId: THREAD_ID, commentId: COMMENT_ID}),
        createThreadResolved({threadId: THREAD_ID}),
      ),
    );

    expect(snapshot.pendingIds.size).toBe(0);
  });
});
