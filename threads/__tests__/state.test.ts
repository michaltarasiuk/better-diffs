import type {SerializedEditorState} from 'lexical';
import {describe, expect, it} from 'vitest';

import {newId} from '@/utils/new-id';

import type {ThreadErrorReason} from '../errors';
import type {
  Actor,
  Anchor,
  Change,
  Comment,
  ShareRows,
  Thread,
} from '../schemas';
import {applyOptimistic, check, initialState, receive} from '../state';

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

function thread(overrides: Partial<Thread> = {}): Thread {
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
  $type: 'thread.opened',
  threadId: THREAD_ID,
  anchor: ANCHOR,
} satisfies Change;

const RESOLVED = {
  $type: 'thread.resolved',
  threadId: THREAD_ID,
} satisfies Change;

function created(commentId = COMMENT_ID, text = 'hello') {
  return {
    $type: 'comment.created',
    threadId: THREAD_ID,
    commentId,
    body: body(text),
  } satisfies Change;
}

function edited(commentId = COMMENT_ID, text = 'edited') {
  return {
    $type: 'comment.edited',
    commentId,
    body: body(text),
  } satisfies Change;
}

function deleted(commentId = COMMENT_ID) {
  return {$type: 'comment.deleted', commentId} satisfies Change;
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
      threads: [thread({resolved: true})],
      comments: [comment(OTHER_COMMENT_ID)],
    });

    expect(next.revision).toBe(2);
    expect(next.version).toBe(1);
    expect(next.threads.get(THREAD_ID)?.resolved).toBe(true);
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

  it('shows edits, deletions and resolutions', () => {
    const state = stateWith();

    expect(
      applyOptimistic(state, optimistic(edited())).comments.get(COMMENT_ID)
        ?.body,
    ).toEqual(body('edited'));
    expect(
      applyOptimistic(state, optimistic(deleted())).comments.has(COMMENT_ID),
    ).toBe(false);
    expect(
      applyOptimistic(state, optimistic(RESOLVED)).threads.get(THREAD_ID)
        ?.resolved,
    ).toBe(true);
  });

  it('keeps the revision and leaves the previous state untouched', () => {
    const state = stateWith();

    const next = applyOptimistic(state, optimistic(deleted()));

    expect(next.revision).toBe(state.revision);
    expect(state.comments.has(COMMENT_ID)).toBe(true);
  });
});

describe('check', () => {
  function rows(overrides: Partial<ShareRows> = {}) {
    return {threads: [thread()], comments: [comment()], ...overrides};
  }

  it('accepts a new thread with its first comment', () => {
    expect(() =>
      check(rows({threads: [], comments: []}), ALICE, [OPENED, created()]),
    ).not.toThrow();
  });

  it('lets anyone reply to and resolve a thread', () => {
    expect(() =>
      check(rows(), BOB, [created(OTHER_COMMENT_ID), RESOLVED]),
    ).not.toThrow();
  });

  it('lets the owner edit and delete a comment in a resolved thread', () => {
    expect(() =>
      check(rows({threads: [thread({resolved: true})]}), ALICE, [
        edited(),
        deleted(),
      ]),
    ).not.toThrow();
  });

  it('checks each change against the earlier ones', () => {
    expect(() => check(rows(), ALICE, [deleted(), edited()])).toThrow(
      `Comment not found: ${COMMENT_ID}`,
    );
    expect(() =>
      check(rows(), ALICE, [RESOLVED, created(OTHER_COMMENT_ID)]),
    ).toThrow(`Thread already resolved: ${THREAD_ID}`);
  });

  it.each([
    ['THREAD_ALREADY_EXISTS', rows(), ALICE, OPENED],
    ['THREAD_NOT_FOUND', rows({threads: []}), ALICE, RESOLVED],
    [
      'THREAD_RESOLVED',
      rows({threads: [thread({resolved: true})]}),
      ALICE,
      created(OTHER_COMMENT_ID),
    ],
    ['COMMENT_ALREADY_EXISTS', rows(), ALICE, created()],
    ['COMMENT_NOT_FOUND', rows({comments: []}), ALICE, edited()],
    ['COMMENT_NOT_FOUND', rows({comments: []}), ALICE, deleted()],
    ['NOT_OWNER', rows(), BOB, edited()],
    ['NOT_OWNER', rows(), BOB, deleted()],
  ] satisfies [ThreadErrorReason, ShareRows, string, Change][])(
    'refuses with %s',
    (reason, given, actorId, refused) => {
      expect(() => check(given, actorId, [refused])).toThrow(
        expect.objectContaining({name: 'ThreadError', reason}),
      );
    },
  );
});
