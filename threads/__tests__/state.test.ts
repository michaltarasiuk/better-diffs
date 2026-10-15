import type {SerializedEditorState} from 'lexical';
import {describe, expect, it} from 'vitest';

import {newId} from '#/utils/new-id';

import type {ThreadErrorReason} from '../errors';
import type {
  Actor,
  Anchor,
  Change,
  Comment,
  StoredIds,
  Thread,
} from '../schemas';
import {applyOptimistic, check, initialState, receive} from '../state';

const THREAD_ID = newId();
const COMMENT_ID = newId();
const OTHER_COMMENT_ID = newId();

const ALICE = 'alice';
const CREATED_AT = new Date().toISOString();

const ANCHOR = {
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

function thread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: THREAD_ID,
    anchor: ANCHOR,
    actorId: ALICE,
    actor: actor(ALICE),
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function comment(commentId = COMMENT_ID, text = 'hello'): Comment {
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
  type: 'openThread',
  threadId: THREAD_ID,
  anchor: ANCHOR,
} satisfies Change;

function created(commentId = COMMENT_ID, text = 'hello') {
  return {
    type: 'createComment',
    threadId: THREAD_ID,
    commentId,
    body: body(text),
  } satisfies Change;
}

function optimistic(change: Change, actorId = ALICE) {
  return {actorId, actor: actor(actorId), createdAt: CREATED_AT, change};
}

function stateWith(
  threads: Thread[] = [thread()],
  comments: Comment[] = [comment()],
  revision = 1,
) {
  return initialState({revision, threads, comments});
}

describe('initialState', () => {
  it('keys threads and comments by id, in the order given', () => {
    const state = stateWith(
      [thread()],
      [comment(OTHER_COMMENT_ID), comment(COMMENT_ID)],
      4,
    );

    expect(state.revision).toBe(4);
    expect(state.version).toBe(0);
    expect(state.threads.get(THREAD_ID)).toEqual(thread());
    expect([...state.comments.keys()]).toEqual([OTHER_COMMENT_ID, COMMENT_ID]);
  });
});

describe('receive', () => {
  it('replaces the rows with a newer snapshot', () => {
    const state = stateWith();

    const next = receive(state, {
      revision: 2,
      threads: [],
      comments: [comment(OTHER_COMMENT_ID)],
    });

    expect(next.revision).toBe(2);
    expect(next.version).toBe(1);
    expect(next.threads.size).toBe(0);
    expect([...next.comments.keys()]).toEqual([OTHER_COMMENT_ID]);
  });

  it('ignores a snapshot that is not newer', () => {
    const state = stateWith();

    expect(receive(state, {revision: 1, threads: [], comments: []})).toBe(
      state,
    );
  });
});

describe('applyOptimistic', () => {
  it('shows a new thread with its first comment', () => {
    const state = initialState({revision: 0, threads: [], comments: []});

    const next = [optimistic(OPENED), optimistic(created())].reduce(
      applyOptimistic,
      state,
    );

    expect(next.threads.get(THREAD_ID)).toEqual(thread());
    expect(next.comments.get(COMMENT_ID)).toEqual(comment());
    expect(next.version).toBe(2);
  });

  it('keeps the revision and leaves the previous state untouched', () => {
    const state = stateWith();

    const next = applyOptimistic(state, optimistic(created(OTHER_COMMENT_ID)));

    expect(next.revision).toBe(state.revision);
    expect(state.comments.has(OTHER_COMMENT_ID)).toBe(false);
  });
});

describe('check', () => {
  function stored(overrides: Partial<StoredIds> = {}) {
    return {threadIds: [THREAD_ID], commentIds: [COMMENT_ID], ...overrides};
  }

  it('accepts a new thread with its first comment', () => {
    expect(
      check(stored({threadIds: [], commentIds: []}), [OPENED, created()]),
    ).toBeUndefined();
  });

  it('accepts a reply to a thread', () => {
    expect(check(stored(), [created(OTHER_COMMENT_ID)])).toBeUndefined();
  });

  it('checks each change against the earlier ones', () => {
    expect(
      check(stored(), [created(OTHER_COMMENT_ID), created(OTHER_COMMENT_ID)]),
    ).toEqual({
      reason: 'COMMENT_ALREADY_EXISTS',
      message: `Comment already exists: ${OTHER_COMMENT_ID}`,
    });
  });

  it.each([
    ['THREAD_ALREADY_EXISTS', stored(), OPENED],
    ['THREAD_NOT_FOUND', stored({threadIds: []}), created(OTHER_COMMENT_ID)],
    ['COMMENT_ALREADY_EXISTS', stored(), created()],
  ] satisfies [ThreadErrorReason, StoredIds, Change][])(
    'refuses with %s',
    (reason, given, refused) => {
      expect(check(given, [refused])).toMatchObject({reason});
    },
  );
});
