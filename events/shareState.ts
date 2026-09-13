import {assert} from '@/utils/assert';
import {isDefined} from '@/utils/defined';

import type {Anchor, ShareEvent, ShareEventPayload} from './schemas';
import type {SerializedEditorState} from 'lexical';

export interface ThreadState {
  readonly id: string;
  readonly anchor: Anchor;
  readonly actorId: string;
  resolved: boolean;
  commentIds: string[];
  readonly createdAt: string;
}

export interface CommentState {
  readonly id: string;
  readonly threadId: string;
  readonly actorId: string;
  body: SerializedEditorState;
  deleted: boolean;
  readonly createdAt: string;
}

export interface FoldedShareState {
  readonly threads: ReadonlyMap<string, ThreadState>;
  readonly comments: ReadonlyMap<string, CommentState>;
  readonly pendingIds: ReadonlySet<string>;
}

export const EMPTY_PENDING_IDS: ReadonlySet<string> = new Set();

export const EMPTY_FOLDED_STATE: FoldedShareState = {
  threads: new Map(),
  comments: new Map(),
  pendingIds: EMPTY_PENDING_IDS,
};

export interface OptimisticEvent {
  readonly actorId: string;
  readonly createdAt: string;
  readonly payload: ShareEventPayload;
}

export function isType<T extends ShareEventPayload['$type']>(
  type: T,
  payload: ShareEventPayload,
): payload is Extract<ShareEventPayload, {$type: T}> {
  return payload.$type === type;
}

export class ShareState {
  readonly threads = new Map<string, ThreadState>();
  readonly comments = new Map<string, CommentState>();
  #latestSeq = 0;
  #pending = new Map<string, OptimisticEvent>();
  #snapshot: FoldedShareState | undefined;
  #subscribers = new Set<() => void>();

  ingest(events: readonly ShareEvent[]) {
    let changed = false;

    for (const event of events) {
      assert(
        event.seq > this.#latestSeq,
        `Event seq ${event.seq} is not after latest ${this.#latestSeq}`,
      );

      this.#latestSeq = event.seq;
      this.#apply(event);
      this.#reconcilePending(event.payload);
      changed = true;
    }

    if (changed) {
      this.#commit();
    }

    return changed;
  }

  optimistic(event: OptimisticEvent) {
    this.#assertOptimistic(event);
    const pendingId = crypto.randomUUID();
    this.#pending.set(pendingId, event);
    this.#commit();
    return pendingId;
  }

  optimisticAll(events: readonly OptimisticEvent[]) {
    const pendingIds: string[] = [];
    for (const event of events) {
      this.#assertOptimistic(event);
      const pendingId = crypto.randomUUID();
      this.#pending.set(pendingId, event);
      pendingIds.push(pendingId);
    }
    if (pendingIds.length > 0) {
      this.#commit();
    }
    return pendingIds;
  }

  reject(pendingId: string) {
    const deleted = this.#pending.delete(pendingId);
    if (deleted) {
      this.#commit();
    }
    return deleted;
  }

  rejectAll(pendingIds: readonly string[]) {
    let changed = false;
    for (const pendingId of pendingIds) {
      if (this.#pending.delete(pendingId)) {
        changed = true;
      }
    }
    if (changed) {
      this.#commit();
    }
  }

  subscribe = (subscriber: () => void) => {
    this.#subscribers.add(subscriber);
    return () => {
      this.#subscribers.delete(subscriber);
    };
  };

  getSnapshot = (): FoldedShareState => {
    if (!isDefined(this.#snapshot)) {
      this.#snapshot =
        this.#pending.size === 0
          ? {
              threads: this.threads,
              comments: this.comments,
              pendingIds: EMPTY_PENDING_IDS,
            }
          : this.#mergePending();
    }
    return this.#snapshot;
  };

  #commit() {
    this.#snapshot = undefined;
    for (const subscriber of this.#subscribers) {
      subscriber();
    }
  }

  #reconcilePending(payload: ShareEventPayload) {
    for (const [pendingId, event] of this.#pending) {
      if (isSupersededBy(event.payload, payload)) {
        this.#pending.delete(pendingId);
      }
    }
  }

  #mergePending(): FoldedShareState {
    const threads = new Map(this.threads);
    const comments = new Map(this.comments);
    const pendingIds = new Set<string>();

    const cloneThread = (threadId: string) => {
      const thread = threads.get(threadId);
      assert(isDefined(thread), `Thread not found: ${threadId}`);
      if (this.threads.get(threadId) === thread) {
        const cloned: ThreadState = {
          ...thread,
          commentIds: [...thread.commentIds],
        };
        threads.set(threadId, cloned);
        return cloned;
      }
      return thread;
    };

    const cloneComment = (commentId: string) => {
      const comment = comments.get(commentId);
      assert(isDefined(comment), `Comment not found: ${commentId}`);
      if (this.comments.get(commentId) === comment) {
        const cloned: CommentState = {...comment};
        comments.set(commentId, cloned);
        return cloned;
      }
      return comment;
    };

    for (const event of this.#pending.values()) {
      const {actorId, createdAt, payload} = event;

      if (isType('thread.opened', payload)) {
        threads.set(payload.threadId, {
          id: payload.threadId,
          anchor: payload.anchor,
          actorId,
          resolved: false,
          commentIds: [],
          createdAt,
        });
        pendingIds.add(payload.threadId);
        continue;
      }

      if (isType('comment.created', payload)) {
        const thread = cloneThread(payload.threadId);
        thread.commentIds.push(payload.commentId);
        comments.set(payload.commentId, {
          id: payload.commentId,
          threadId: payload.threadId,
          actorId,
          body: payload.body,
          deleted: false,
          createdAt,
        });
        pendingIds.add(payload.commentId);
        continue;
      }

      if (isType('comment.edited', payload)) {
        const comment = cloneComment(payload.commentId);
        comment.body = payload.body;
        pendingIds.add(payload.commentId);
        continue;
      }

      if (isType('comment.deleted', payload)) {
        const comment = cloneComment(payload.commentId);
        comment.deleted = true;
        pendingIds.add(payload.commentId);
        continue;
      }

      if (isType('thread.resolved', payload)) {
        const thread = cloneThread(payload.threadId);
        thread.resolved = true;
        pendingIds.add(payload.threadId);
        continue;
      }

      payload satisfies never;
    }

    return {threads, comments, pendingIds};
  }

  #assertOptimistic(event: OptimisticEvent) {
    const {payload} = event;

    if (isType('thread.opened', payload)) {
      assert(
        !this.#hasThread(payload.threadId),
        `Thread already opened: ${payload.threadId}`,
      );
      return;
    }

    if (isType('comment.created', payload)) {
      assert(
        this.#hasThread(payload.threadId),
        `Comment on unknown thread: ${payload.threadId}`,
      );
      assert(
        !this.#hasComment(payload.commentId),
        `Comment already created: ${payload.commentId}`,
      );
      return;
    }

    if (isType('comment.edited', payload)) {
      const comment = this.#getComment(payload.commentId);
      assert(isDefined(comment), `Comment not found: ${payload.commentId}`);
      assert(!comment.deleted, `Comment already deleted: ${payload.commentId}`);
      return;
    }

    if (isType('comment.deleted', payload)) {
      const comment = this.#getComment(payload.commentId);
      assert(isDefined(comment), `Comment not found: ${payload.commentId}`);
      assert(!comment.deleted, `Comment already deleted: ${payload.commentId}`);
      return;
    }

    if (isType('thread.resolved', payload)) {
      const thread = this.#getThread(payload.threadId);
      assert(isDefined(thread), `Thread not found: ${payload.threadId}`);
      assert(!thread.resolved, `Thread already resolved: ${payload.threadId}`);
      return;
    }

    payload satisfies never;
  }

  #hasThread(threadId: string) {
    return isDefined(this.#getThread(threadId));
  }

  #hasComment(commentId: string) {
    return isDefined(this.#getComment(commentId));
  }

  #getThread(threadId: string) {
    let thread = this.threads.get(threadId);

    for (const event of this.#pending.values()) {
      const {payload} = event;
      if (isType('thread.opened', payload) && payload.threadId === threadId) {
        thread = {
          id: threadId,
          anchor: payload.anchor,
          actorId: event.actorId,
          resolved: false,
          commentIds: [],
          createdAt: event.createdAt,
        };
        continue;
      }
      if (
        isType('thread.resolved', payload) &&
        payload.threadId === threadId &&
        isDefined(thread)
      ) {
        thread = {...thread, resolved: true};
      }
    }

    return thread;
  }

  #getComment(commentId: string) {
    let comment = this.comments.get(commentId);

    for (const event of this.#pending.values()) {
      const {payload} = event;
      if (
        isType('comment.created', payload) &&
        payload.commentId === commentId
      ) {
        comment = {
          id: commentId,
          threadId: payload.threadId,
          actorId: event.actorId,
          body: payload.body,
          deleted: false,
          createdAt: event.createdAt,
        };
        continue;
      }
      if (
        isType('comment.edited', payload) &&
        payload.commentId === commentId &&
        isDefined(comment)
      ) {
        comment = {...comment, body: payload.body};
        continue;
      }
      if (
        isType('comment.deleted', payload) &&
        payload.commentId === commentId &&
        isDefined(comment)
      ) {
        comment = {...comment, deleted: true};
      }
    }

    return comment;
  }

  #apply(event: ShareEvent) {
    const {actorId, payload, createdAt} = event;

    if (isType('thread.opened', payload)) {
      assert(
        !this.threads.has(payload.threadId),
        `Thread already opened: ${payload.threadId}`,
      );

      this.threads.set(payload.threadId, {
        id: payload.threadId,
        anchor: payload.anchor,
        actorId,
        resolved: false,
        commentIds: [],
        createdAt,
      });
      return;
    }

    if (isType('comment.created', payload)) {
      const thread = this.threads.get(payload.threadId);
      assert(
        isDefined(thread),
        `Comment on unknown thread: ${payload.threadId}`,
      );
      assert(
        !this.comments.has(payload.commentId),
        `Comment already created: ${payload.commentId}`,
      );
      assert(
        !thread.commentIds.includes(payload.commentId),
        `Comment already on thread: ${payload.commentId}`,
      );

      thread.commentIds.push(payload.commentId);
      this.comments.set(payload.commentId, {
        id: payload.commentId,
        threadId: payload.threadId,
        actorId,
        body: payload.body,
        deleted: false,
        createdAt,
      });
      return;
    }

    if (isType('comment.edited', payload)) {
      const comment = this.comments.get(payload.commentId);
      assert(isDefined(comment), `Comment not found: ${payload.commentId}`);
      assert(!comment.deleted, `Comment already deleted: ${payload.commentId}`);

      comment.body = payload.body;
      return;
    }

    if (isType('comment.deleted', payload)) {
      const comment = this.comments.get(payload.commentId);
      assert(isDefined(comment), `Comment not found: ${payload.commentId}`);
      assert(!comment.deleted, `Comment already deleted: ${payload.commentId}`);

      comment.deleted = true;
      return;
    }

    if (isType('thread.resolved', payload)) {
      const thread = this.threads.get(payload.threadId);
      assert(isDefined(thread), `Thread not found: ${payload.threadId}`);
      assert(!thread.resolved, `Thread already resolved: ${payload.threadId}`);

      thread.resolved = true;
      return;
    }

    payload satisfies never;
  }
}

function isSupersededBy(
  pending: ShareEventPayload,
  confirmed: ShareEventPayload,
) {
  if (pending.$type !== confirmed.$type) {
    return false;
  }

  switch (confirmed.$type) {
    case 'thread.opened':
      return (
        isType('thread.opened', pending) &&
        pending.threadId === confirmed.threadId
      );
    case 'thread.resolved':
      return (
        isType('thread.resolved', pending) &&
        pending.threadId === confirmed.threadId
      );
    case 'comment.created':
      return (
        isType('comment.created', pending) &&
        pending.commentId === confirmed.commentId
      );
    case 'comment.edited':
      return (
        isType('comment.edited', pending) &&
        pending.commentId === confirmed.commentId
      );
    case 'comment.deleted':
      return (
        isType('comment.deleted', pending) &&
        pending.commentId === confirmed.commentId
      );
    default:
      confirmed satisfies never;
      return false;
  }
}

export function foldEvents(events: readonly ShareEvent[]) {
  const state = new ShareState();
  state.ingest(events);
  return state.getSnapshot();
}
