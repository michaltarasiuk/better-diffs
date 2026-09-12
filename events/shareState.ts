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
}

export const EMPTY_FOLDED_STATE: FoldedShareState = {
  threads: new Map(),
  comments: new Map(),
};

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
  #snapshot: FoldedShareState | undefined;
  #subscribers = new Set<() => void>();

  ingest(events: readonly ShareEvent[]) {
    let changed = false;

    for (const event of events) {
      if (event.seq <= this.#latestSeq) {
        continue;
      }

      this.#latestSeq = event.seq;
      this.#apply(event);
      changed = true;
    }

    if (changed) {
      this.#commit();
    }

    return changed;
  }

  subscribe = (subscriber: () => void) => {
    this.#subscribers.add(subscriber);
    return () => {
      this.#subscribers.delete(subscriber);
    };
  };

  getSnapshot = (): FoldedShareState => {
    if (!this.#snapshot) {
      this.#snapshot = {
        threads: this.threads,
        comments: this.comments,
      };
    }
    return this.#snapshot;
  };

  #commit() {
    this.#snapshot = undefined;
    for (const subscriber of this.#subscribers) {
      subscriber();
    }
  }

  #apply(event: ShareEvent) {
    const {payload, actorId, createdAt} = event;

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

export function foldEvents(events: readonly ShareEvent[]) {
  const state = new ShareState();
  state.ingest(events);
  return state.getSnapshot();
}
