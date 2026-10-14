import type {SerializedEditorState} from 'lexical';
import {describe, expect, it} from 'vitest';

import {newId} from '@/utils/new-id';

import type {EventErrorReason} from '../errors';
import {
  type Actor,
  type Anchor,
  type Comment,
  type ShareEventPayload,
  type ShareRecords,
  subjectIdFromPayload,
  type Thread,
} from '../schemas';
import {
  applyOptimistic,
  check,
  ingest,
  initialState,
  type OptimisticChange,
} from '../state';

const SHARE_ID = newId();
const THREAD_ID = newId();
const COMMENT_ID = newId();
const OTHER_COMMENT_ID = newId();

const ALICE = 'alice';
const BOB = 'bob';
const CREATED_AT = new Date().toISOString();

const ANCHOR = {
  shareId: SHARE_ID,
  filePath: 'a.txt',
  side: 'additions',
  line: 3,
} satisfies Anchor;

function body(text: string) {
  return {root: {text}} as unknown as SerializedEditorState;
}

function actor(actorId: string): Actor {
  return {name: actorId[0]!.toUpperCase() + actorId.slice(1), image: null};
}

function thread(overrides: Partial<Thread> = {}) {
  return {
    id: THREAD_ID,
    anchor: ANCHOR,
    actorId: ALICE,
    actor: actor(ALICE),
    resolved: false,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function comment(commentId = COMMENT_ID, text = 'hello') {
  return {
    id: commentId,
    threadId: THREAD_ID,
    actorId: ALICE,
    actor: actor(ALICE),
    body: body(text),
    createdAt: CREATED_AT,
  };
}

const OPENED = {
  $type: 'thread.opened',
  threadId: THREAD_ID,
  anchor: ANCHOR,
} satisfies ShareEventPayload;

const RESOLVED = {
  $type: 'thread.resolved',
  threadId: THREAD_ID,
} satisfies ShareEventPayload;

function created(commentId = COMMENT_ID, text = 'hello') {
  return {
    $type: 'comment.created',
    threadId: THREAD_ID,
    commentId,
    body: body(text),
  } satisfies ShareEventPayload;
}

function edited(commentId = COMMENT_ID, text = 'edited') {
  return {
    $type: 'comment.edited',
    commentId,
    body: body(text),
  } satisfies ShareEventPayload;
}

function deleted(commentId = COMMENT_ID) {
  return {$type: 'comment.deleted', commentId} satisfies ShareEventPayload;
}

function change(payload: ShareEventPayload, actorId = ALICE) {
  return {actorId, actor: actor(actorId), createdAt: CREATED_AT, payload};
}

function event(
  seq: number,
  payload: ShareEventPayload,
  subject: Thread | Comment | null = null,
) {
  const base = {
    id: newId(),
    shareId: SHARE_ID,
    seq,
    subjectId: subjectIdFromPayload(payload),
    actorId: ALICE,
    createdAt: CREATED_AT,
  };

  switch (payload.$type) {
    case 'thread.opened':
    case 'thread.resolved':
      return {
        ...base,
        type: payload.$type,
        thread: subject as Thread | null,
      };
    case 'comment.created':
    case 'comment.edited':
      return {
        ...base,
        type: payload.$type,
        comment: subject as Comment | null,
      };
    case 'comment.deleted':
      return {...base, type: payload.$type};
  }
}

function stateWith(
  threads: Thread[] = [thread()],
  comments: Comment[] = [comment()],
  seq = 2,
) {
  return initialState({seq, threads, comments});
}

describe('initialState', () => {
  it('lists each thread’s comments in the order given', () => {
    const state = stateWith(
      [thread()],
      [comment(OTHER_COMMENT_ID), comment(COMMENT_ID)],
      4,
    );

    expect(state.seq).toBe(4);
    expect(state.version).toBe(0);
    expect(state.threads.get(THREAD_ID)?.commentIds).toEqual([
      OTHER_COMMENT_ID,
      COMMENT_ID,
    ]);
    expect(state.comments.size).toBe(2);
  });
});

describe('ingest', () => {
  it('applies each subject as stored', () => {
    const state = stateWith();

    const next = ingest(state, [
      event(3, edited(), comment(COMMENT_ID, 'edited')),
      event(4, RESOLVED, thread({resolved: true})),
      event(5, created(OTHER_COMMENT_ID), comment(OTHER_COMMENT_ID)),
    ]);

    expect(next.seq).toBe(5);
    expect(next.version).toBe(1);
    expect(next.comments.get(COMMENT_ID)?.body).toEqual(body('edited'));
    expect(next.threads.get(THREAD_ID)).toMatchObject({
      resolved: true,
      commentIds: [COMMENT_ID, OTHER_COMMENT_ID],
    });
  });

  it('removes a deleted comment', () => {
    const next = ingest(stateWith(), [event(3, deleted())]);

    expect(next.comments.has(COMMENT_ID)).toBe(false);
    expect(next.threads.get(THREAD_ID)?.commentIds).toEqual([]);
  });

  it('skips an event whose subject is gone', () => {
    const state = stateWith([thread()], []);

    const next = ingest(state, [
      event(3, created(), null),
      event(4, deleted()),
    ]);

    expect(next.seq).toBe(4);
    expect(next.comments.size).toBe(0);
    expect(next.threads.get(THREAD_ID)?.commentIds).toEqual([]);
  });

  it('skips events it already applied', () => {
    const state = stateWith();

    const next = ingest(state, [
      event(2, deleted()),
      event(3, edited(), comment(COMMENT_ID, 'edited')),
    ]);

    expect(next.seq).toBe(3);
    expect(next.comments.get(COMMENT_ID)?.body).toEqual(body('edited'));
  });

  it('stops at a gap', () => {
    const next = ingest(stateWith(), [
      event(3, edited(), comment(COMMENT_ID, 'edited')),
      event(5, deleted()),
    ]);

    expect(next.seq).toBe(3);
    expect(next.comments.has(COMMENT_ID)).toBe(true);
  });

  it('returns the same state when nothing is new', () => {
    const state = stateWith();

    expect(ingest(state, [])).toBe(state);
    expect(ingest(state, [event(2, deleted())])).toBe(state);
  });

  it('leaves the previous state untouched', () => {
    const state = stateWith();
    const before = state.threads.get(THREAD_ID);

    ingest(state, [
      event(3, created(OTHER_COMMENT_ID), comment(OTHER_COMMENT_ID)),
      event(4, deleted()),
    ]);

    expect(state.threads.get(THREAD_ID)).toBe(before);
    expect(before?.commentIds).toEqual([COMMENT_ID]);
    expect(state.comments.has(COMMENT_ID)).toBe(true);
  });
});

describe('applyOptimistic', () => {
  it('shows a new thread with its first comment', () => {
    const state = initialState({seq: 0, threads: [], comments: []});

    const next = [change(OPENED), change(created())].reduce(
      applyOptimistic,
      state,
    );

    expect(next.threads.get(THREAD_ID)).toEqual({
      ...thread(),
      commentIds: [COMMENT_ID],
    });
    expect(next.comments.get(COMMENT_ID)).toEqual(comment());
    expect(next.version).toBe(2);
  });

  it('does not repeat a change that is already stored', () => {
    const next = applyOptimistic(stateWith(), change(created()));

    expect(next.threads.get(THREAD_ID)?.commentIds).toEqual([COMMENT_ID]);
  });

  it('shows edits, deletions and resolutions', () => {
    const state = stateWith();

    expect(
      applyOptimistic(state, change(edited())).comments.get(COMMENT_ID)?.body,
    ).toEqual(body('edited'));
    expect(
      applyOptimistic(state, change(deleted())).comments.has(COMMENT_ID),
    ).toBe(false);
    expect(
      applyOptimistic(state, change(RESOLVED)).threads.get(THREAD_ID)?.resolved,
    ).toBe(true);
  });

  it('keeps the seq and leaves the previous state untouched', () => {
    const state = stateWith();

    const next = applyOptimistic(state, change(created(OTHER_COMMENT_ID)));

    expect(next.seq).toBe(state.seq);
    expect(state.threads.get(THREAD_ID)?.commentIds).toEqual([COMMENT_ID]);
    expect(state.comments.has(OTHER_COMMENT_ID)).toBe(false);
  });
});

describe('check', () => {
  function records(overrides: Partial<ShareRecords> = {}) {
    return {threads: [thread()], comments: [comment()], ...overrides};
  }

  it('accepts a new thread with its first comment', () => {
    expect(() =>
      check(records({threads: [], comments: []}), [
        change(OPENED),
        change(created()),
      ]),
    ).not.toThrow();
  });

  it('lets anyone reply to and resolve a thread', () => {
    expect(() =>
      check(records(), [
        change(created(OTHER_COMMENT_ID), BOB),
        change(RESOLVED, BOB),
      ]),
    ).not.toThrow();
  });

  it('lets the owner edit and delete a comment in a resolved thread', () => {
    expect(() =>
      check(records({threads: [thread({resolved: true})]}), [
        change(edited()),
        change(deleted()),
      ]),
    ).not.toThrow();
  });

  it('checks each change against the earlier ones', () => {
    expect(() =>
      check(records(), [change(deleted()), change(edited())]),
    ).toThrow(`Comment already deleted: ${COMMENT_ID}`);
  });

  it.each([
    ['THREAD_ALREADY_EXISTS', records(), change(OPENED)],
    ['THREAD_NOT_FOUND', records({threads: []}), change(RESOLVED)],
    [
      'THREAD_RESOLVED',
      records({threads: [thread({resolved: true})]}),
      change(created(OTHER_COMMENT_ID)),
    ],
    ['COMMENT_ALREADY_EXISTS', records(), change(created())],
    [
      'COMMENT_ALREADY_EXISTS',
      records({comments: [], deletedCommentIds: [COMMENT_ID]}),
      change(created()),
    ],
    ['COMMENT_NOT_FOUND', records({comments: []}), change(edited())],
    [
      'COMMENT_DELETED',
      records({comments: [], deletedCommentIds: [COMMENT_ID]}),
      change(deleted()),
    ],
    ['NOT_OWNER', records(), change(edited(), BOB)],
    ['NOT_OWNER', records(), change(deleted(), BOB)],
  ] satisfies [EventErrorReason, ShareRecords, OptimisticChange][])(
    'refuses with %s',
    (reason, given, refused) => {
      expect(() => check(given, [refused])).toThrow(
        expect.objectContaining({name: 'EventError', reason}),
      );
    },
  );
});
