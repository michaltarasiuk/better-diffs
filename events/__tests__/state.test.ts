import type {SerializedEditorState} from 'lexical';
import {describe, expect, it, vi} from 'vitest';

import {newId} from '@/utils/new-id';

import type {Actor, Anchor, ShareEvent, ShareEventPayload} from '../schemas';
import {
  Draft,
  EMPTY_FOLDED_STATE,
  isType,
  type OptimisticEvent,
  ShareState,
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
  filePath: 'src/index.ts',
  side: 'additions',
  line: 3,
} satisfies Anchor;

function body(text: string) {
  return {root: {text}} as unknown as SerializedEditorState;
}

function actor(actorId: string): Actor {
  return {name: actorId, image: null};
}

function optimistic(
  payload: ShareEventPayload,
  actorId = ALICE,
): OptimisticEvent {
  return {actorId, actor: actor(actorId), createdAt: CREATED_AT, payload};
}

let nextSeq = 0;
function confirmed(
  payload: ShareEventPayload,
  {actorId = ALICE, seq = ++nextSeq} = {},
): ShareEvent {
  return {
    ...optimistic(payload, actorId),
    id: newId(),
    shareId: SHARE_ID,
    seq,
    type: payload.$type,
    subjectId: 'commentId' in payload ? payload.commentId : payload.threadId,
  };
}

const opened = {
  $type: 'thread.opened',
  threadId: THREAD_ID,
  anchor: ANCHOR,
} satisfies ShareEventPayload;

const resolved = {
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

function emptyEntities() {
  return {
    threads: new Map(),
    comments: new Map(),
    deletedCommentIds: new Set<string>(),
  };
}

describe('Draft', () => {
  function liveDraft(...payloads: ShareEventPayload[]) {
    const draft = Draft.live(emptyEntities());
    for (const payload of payloads) {
      draft.apply(optimistic(payload));
    }
    return draft;
  }

  it('opens a thread', () => {
    const draft = liveDraft(opened);

    expect(draft.threads.get(THREAD_ID)).toEqual({
      id: THREAD_ID,
      anchor: ANCHOR,
      actorId: ALICE,
      actor: actor(ALICE),
      resolved: false,
      commentIds: [],
      createdAt: CREATED_AT,
    });
  });

  it('rejects opening a thread twice', () => {
    const draft = liveDraft(opened);

    expect(() => draft.apply(optimistic(opened))).toThrow(
      `Thread already exists: ${THREAD_ID}`,
    );
  });

  it('resolves a thread owned by the actor', () => {
    const draft = liveDraft(opened, resolved);

    expect(draft.threads.get(THREAD_ID)?.resolved).toBe(true);
  });

  it('rejects resolving a thread owned by another actor', () => {
    const draft = liveDraft(opened);

    expect(() => draft.apply(optimistic(resolved, BOB))).toThrow(
      `${THREAD_ID} not owned by actor: ${BOB}`,
    );
  });

  it('rejects resolving a missing thread', () => {
    const draft = liveDraft();

    expect(() => draft.apply(optimistic(resolved))).toThrow(
      `Thread not found: ${THREAD_ID}`,
    );
  });

  it('rejects changes to a resolved thread', () => {
    const draft = liveDraft(opened, resolved);

    expect(() => draft.apply(optimistic(resolved))).toThrow(
      `Thread already resolved: ${THREAD_ID}`,
    );
    expect(() => draft.apply(optimistic(created()))).toThrow(
      `Thread already resolved: ${THREAD_ID}`,
    );
  });

  it('creates comments in order', () => {
    const draft = Draft.live(emptyEntities());
    draft.apply(optimistic(opened));
    draft.apply(optimistic(created(COMMENT_ID, 'first')));
    draft.apply(optimistic(created(OTHER_COMMENT_ID, 'second'), BOB));

    expect(draft.threads.get(THREAD_ID)?.commentIds).toEqual([
      COMMENT_ID,
      OTHER_COMMENT_ID,
    ]);
    expect(draft.comments.get(OTHER_COMMENT_ID)).toEqual({
      id: OTHER_COMMENT_ID,
      threadId: THREAD_ID,
      actorId: BOB,
      actor: actor(BOB),
      body: body('second'),
      createdAt: CREATED_AT,
    });
  });

  it('edits a comment owned by the actor', () => {
    const draft = liveDraft(opened, created(), edited());

    expect(draft.comments.get(COMMENT_ID)?.body).toEqual(body('edited'));
  });

  it('rejects editing a comment owned by another actor', () => {
    const draft = liveDraft(opened, created());

    expect(() => draft.apply(optimistic(edited(), BOB))).toThrow(
      `${COMMENT_ID} not owned by actor: ${BOB}`,
    );
  });

  it('rejects editing a missing comment', () => {
    const draft = liveDraft(opened);

    expect(() => draft.apply(optimistic(edited()))).toThrow(
      `Comment not found: ${COMMENT_ID}`,
    );
  });

  it('deletes a comment and remembers it', () => {
    const draft = liveDraft(opened, created(), deleted());

    expect(draft.comments.has(COMMENT_ID)).toBe(false);
    expect(draft.threads.get(THREAD_ID)?.commentIds).toEqual([]);
    expect(draft.deletedCommentIds).toEqual(new Set([COMMENT_ID]));
  });

  it('rejects changes to a deleted comment', () => {
    const draft = liveDraft(opened, created(), deleted());

    expect(() => draft.apply(optimistic(edited()))).toThrow(
      `Comment already deleted: ${COMMENT_ID}`,
    );
    expect(() => draft.apply(optimistic(deleted()))).toThrow(
      `Comment already deleted: ${COMMENT_ID}`,
    );
  });

  describe('fork', () => {
    it('leaves the base untouched', () => {
      const base = liveDraft(opened, created());
      const thread = base.threads.get(THREAD_ID)!;
      const comment = base.comments.get(COMMENT_ID)!;

      const fork = Draft.fork(base);
      fork.apply(optimistic(edited()));
      fork.apply(optimistic(created(OTHER_COMMENT_ID)));
      fork.apply(optimistic(deleted()));
      fork.apply(optimistic(resolved));

      expect(base.threads.get(THREAD_ID)).toBe(thread);
      expect(thread).toMatchObject({resolved: false, commentIds: [COMMENT_ID]});
      expect(base.comments.get(COMMENT_ID)).toBe(comment);
      expect(comment.body).toEqual(body('hello'));
      expect(base.comments.has(OTHER_COMMENT_ID)).toBe(false);
      expect(base.deletedCommentIds.size).toBe(0);

      expect(fork.threads.get(THREAD_ID)).toMatchObject({
        resolved: true,
        commentIds: [OTHER_COMMENT_ID],
      });
    });

    it('copies an entity once and then mutates its own copy', () => {
      const base = liveDraft(opened, created());
      const fork = Draft.fork(base);

      fork.apply(optimistic(edited(COMMENT_ID, 'one')));
      const copy = fork.comments.get(COMMENT_ID);
      fork.apply(optimistic(edited(COMMENT_ID, 'two')));

      expect(copy).not.toBe(base.comments.get(COMMENT_ID));
      expect(fork.comments.get(COMMENT_ID)).toBe(copy);
      expect(copy?.body).toEqual(body('two'));
    });
  });
});

describe('ShareState', () => {
  function stateWith(...payloads: ShareEventPayload[]) {
    const state = new ShareState();
    state.ingest(payloads.map((payload) => confirmed(payload)));
    return state;
  }

  it('starts empty', () => {
    const snapshot = new ShareState().getSnapshot();

    expect(snapshot).toEqual(EMPTY_FOLDED_STATE);
  });

  it('caches the snapshot until something changes', () => {
    const state = new ShareState();
    const first = state.getSnapshot();

    expect(state.getSnapshot()).toBe(first);

    state.ingest([confirmed(opened)]);

    expect(state.getSnapshot()).not.toBe(first);
    expect(state.getSnapshot().version).toBe(1);
  });

  describe('ingest', () => {
    it('folds confirmed events', () => {
      const state = stateWith(opened, created());
      const {threads, comments, pendingIds} = state.getSnapshot();

      expect(threads.get(THREAD_ID)?.commentIds).toEqual([COMMENT_ID]);
      expect(comments.get(COMMENT_ID)?.body).toEqual(body('hello'));
      expect(pendingIds.size).toBe(0);
    });

    it('returns false and skips notifying for an empty batch', () => {
      const state = new ShareState();
      const subscriber = vi.fn();
      state.subscribe(subscriber);

      expect(state.ingest([])).toBe(false);
      expect(subscriber).not.toHaveBeenCalled();
      expect(state.getSnapshot().version).toBe(0);
    });

    it('notifies subscribers once per batch', () => {
      const state = new ShareState();
      const subscriber = vi.fn();
      state.subscribe(subscriber);

      expect(state.ingest([confirmed(opened), confirmed(created())])).toBe(
        true,
      );
      expect(subscriber).toHaveBeenCalledOnce();
    });

    it('stops notifying after unsubscribing', () => {
      const state = new ShareState();
      const subscriber = vi.fn();
      const unsubscribe = state.subscribe(subscriber);

      unsubscribe();
      state.ingest([confirmed(opened)]);

      expect(subscriber).not.toHaveBeenCalled();
    });

    it.each([
      ['repeated', 1],
      ['older', 0],
    ])('rejects a %s seq', (_name, seq) => {
      const state = new ShareState();
      state.ingest([confirmed(opened, {seq: 1})]);

      expect(() => state.ingest([confirmed(created(), {seq})])).toThrow(
        `Invalid event seq: ${seq}`,
      );
    });

    it('accepts gaps in seq', () => {
      const state = new ShareState();

      expect(() =>
        state.ingest([
          confirmed(opened, {seq: 1}),
          confirmed(created(), {seq: 5}),
        ]),
      ).not.toThrow();
    });
  });

  describe('optimistic', () => {
    it('shows pending events on top of confirmed state', () => {
      const state = stateWith(opened);

      state.optimistic(optimistic(created()));
      const {threads, comments, pendingIds} = state.getSnapshot();

      expect(threads.get(THREAD_ID)?.commentIds).toEqual([COMMENT_ID]);
      expect(comments.has(COMMENT_ID)).toBe(true);
      expect(pendingIds).toEqual(new Set([COMMENT_ID]));
    });

    it('keeps confirmed entities untouched', () => {
      const state = stateWith(opened, created());

      state.optimistic(optimistic(edited()));

      expect(state.comments.get(COMMENT_ID)?.body).toEqual(body('hello'));
      expect(state.getSnapshot().comments.get(COMMENT_ID)?.body).toEqual(
        body('edited'),
      );
    });

    it('throws without recording an invalid event', () => {
      const state = stateWith(opened);
      const subscriber = vi.fn();
      state.subscribe(subscriber);

      expect(() => state.optimistic(optimistic(edited()))).toThrow(
        `Comment not found: ${COMMENT_ID}`,
      );
      expect(subscriber).not.toHaveBeenCalled();
      expect(state.getSnapshot().pendingIds.size).toBe(0);
    });

    it('hides pending events invalidated by a confirmed event', () => {
      const state = stateWith(opened);

      state.optimistic(optimistic(created(), BOB));
      state.ingest([confirmed(resolved)]);

      const {threads, comments} = state.getSnapshot();
      expect(threads.get(THREAD_ID)?.resolved).toBe(true);
      expect(comments.has(COMMENT_ID)).toBe(false);
    });

    it('validates a batch atomically', () => {
      const state = new ShareState();

      expect(() =>
        state.optimisticAll([optimistic(opened), optimistic(edited())]),
      ).toThrow();
      expect(state.getSnapshot().threads.size).toBe(0);
    });

    it('returns one pending id per event', () => {
      const state = new ShareState();

      const pendingIds = state.optimisticAll([
        optimistic(opened),
        optimistic(created()),
      ]);

      expect(pendingIds).toHaveLength(2);
      expect(new Set(pendingIds).size).toBe(2);
      expect(state.getSnapshot().pendingIds).toEqual(
        new Set([THREAD_ID, COMMENT_ID]),
      );
    });

    it('does nothing for an empty batch', () => {
      const state = new ShareState();
      const subscriber = vi.fn();
      state.subscribe(subscriber);

      expect(state.optimisticAll([])).toEqual([]);
      expect(subscriber).not.toHaveBeenCalled();
    });

    it('drops pending events once the server confirms them', () => {
      const state = new ShareState();
      state.optimisticAll([optimistic(opened), optimistic(created())]);

      state.ingest([confirmed(opened), confirmed(created())]);
      const {threads, pendingIds} = state.getSnapshot();

      expect(pendingIds.size).toBe(0);
      expect(threads.get(THREAD_ID)?.commentIds).toEqual([COMMENT_ID]);
    });

    it('keeps pending events that the server has not confirmed yet', () => {
      const state = new ShareState();
      state.optimisticAll([optimistic(opened), optimistic(created())]);

      state.ingest([confirmed(opened)]);

      expect(state.getSnapshot().pendingIds).toEqual(new Set([COMMENT_ID]));
    });

    it('only reconciles events of the same type', () => {
      const state = stateWith(opened, created());
      state.optimistic(optimistic(deleted()));

      state.ingest([confirmed(edited())]);

      expect(state.getSnapshot().pendingIds).toEqual(new Set([COMMENT_ID]));
      expect(state.getSnapshot().comments.has(COMMENT_ID)).toBe(false);
    });
  });

  describe('reject', () => {
    it('removes a pending event', () => {
      const state = stateWith(opened);
      const pendingId = state.optimistic(optimistic(created()));
      const subscriber = vi.fn();
      state.subscribe(subscriber);

      expect(state.reject(pendingId)).toBe(true);
      expect(subscriber).toHaveBeenCalledOnce();
      expect(state.getSnapshot().comments.has(COMMENT_ID)).toBe(false);
      expect(state.getSnapshot().pendingIds.size).toBe(0);
    });

    it('returns false for an unknown pending id', () => {
      const state = new ShareState();
      const subscriber = vi.fn();
      state.subscribe(subscriber);

      expect(state.reject('unknown')).toBe(false);
      expect(subscriber).not.toHaveBeenCalled();
    });

    it('removes several pending events with one notification', () => {
      const state = new ShareState();
      const pendingIds = state.optimisticAll([
        optimistic(opened),
        optimistic(created()),
      ]);
      const subscriber = vi.fn();
      state.subscribe(subscriber);

      expect(state.rejectAll([...pendingIds, 'unknown'])).toBe(true);
      expect(subscriber).toHaveBeenCalledOnce();
      expect(state.getSnapshot().threads.size).toBe(0);
    });
  });
});

describe('isType', () => {
  it('matches the payload type', () => {
    expect(isType('thread.opened', opened)).toBe(true);
    expect(isType('thread.resolved', opened)).toBe(false);
  });
});
