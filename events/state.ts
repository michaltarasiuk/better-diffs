import type {SerializedEditorState} from 'lexical';

import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';

import {
  subjectIdFromPayload,
  type Actor,
  type Anchor,
  type ShareEvent,
  type ShareEventPayload,
} from './schemas';

export interface ThreadState {
  readonly id: string;
  readonly anchor: Anchor;
  readonly actorId: string;
  readonly actor: Actor;
  resolved: boolean;
  commentIds: string[];
  readonly createdAt: string;
}

export interface CommentState {
  readonly id: string;
  readonly threadId: string;
  readonly actorId: string;
  readonly actor: Actor;
  body: SerializedEditorState;
  readonly createdAt: string;
}

export interface FoldedState {
  readonly threads: ReadonlyMap<string, ThreadState>;
  readonly comments: ReadonlyMap<string, CommentState>;
  readonly deletedCommentIds: ReadonlySet<string>;
  readonly pendingIds: ReadonlySet<string>;
  readonly version: number;
}

export interface OptimisticEvent {
  readonly actorId: string;
  readonly actor: Actor;
  readonly createdAt: string;
  readonly payload: ShareEventPayload;
}

export const EMPTY_FOLDED_STATE: FoldedState = {
  threads: new Map(),
  comments: new Map(),
  deletedCommentIds: new Set(),
  pendingIds: new Set(),
  version: 0,
};

export class ShareState {
  readonly threads = new Map<string, ThreadState>();
  readonly comments = new Map<string, CommentState>();
  readonly deletedCommentIds = new Set<string>();

  #confirmed = Draft.live(this);
  #snapshot: FoldedState | null = null;
  #pending = new Map<string, OptimisticEvent>();
  #version = 0;
  #latestSeq = 0;
  #subscribers = new Set<() => void>();

  subscribe = (subscriber: () => void) => {
    this.#subscribers.add(subscriber);
    return () => {
      this.#subscribers.delete(subscriber);
    };
  };

  getSnapshot = () => {
    this.#snapshot ??= this.#fold();
    return this.#snapshot;
  };

  ingest(events: readonly ShareEvent[]) {
    for (const event of events) {
      if (event.seq <= this.#latestSeq) {
        throw new Error(`Invalid event seq: ${event.seq}`);
      }
      this.#latestSeq = event.seq;

      this.#confirmed.apply(event);
      this.#reconcilePending(event.payload);
    }

    if (events.length === 0) {
      return false;
    }
    this.#commit();
    return true;
  }

  optimistic(event: OptimisticEvent) {
    const [pendingId] = this.optimisticAll([event]);
    return pendingId!;
  }

  optimisticAll(events: readonly OptimisticEvent[]) {
    if (events.length === 0) {
      return [];
    }

    const draft = this.#draftWithPending();
    for (const event of events) {
      draft.apply(event);
    }

    const pendingIds = events.map((event) => {
      const pendingId = newId();
      this.#pending.set(pendingId, event);
      return pendingId;
    });
    this.#commit();
    return pendingIds;
  }

  reject(pendingId: string) {
    return this.rejectAll([pendingId]);
  }

  rejectAll(pendingIds: readonly string[]) {
    let changed = false;
    for (const pendingId of pendingIds) {
      changed = this.#pending.delete(pendingId) || changed;
    }
    if (changed) {
      this.#commit();
    }
    return changed;
  }

  #commit() {
    this.#snapshot = null;
    this.#version += 1;
    for (const subscriber of this.#subscribers) {
      subscriber();
    }
  }

  #fold(): FoldedState {
    const {threads, comments, deletedCommentIds} =
      this.#pending.size > 0 ? this.#draftWithPending() : this;
    const pendingIds = new Set(
      Array.from(this.#pending.values(), ({payload}) =>
        subjectIdFromPayload(payload),
      ),
    );

    return {
      threads,
      comments,
      deletedCommentIds,
      pendingIds,
      version: this.#version,
    };
  }

  #draftWithPending() {
    const draft = Draft.fork(this);
    for (const event of this.#pending.values()) {
      draft.apply(event);
    }
    return draft;
  }

  #reconcilePending(confirmed: ShareEventPayload) {
    for (const [pendingId, {payload}] of this.#pending) {
      if (isSupersededBy(payload, confirmed)) {
        this.#pending.delete(pendingId);
      }
    }
  }
}

interface Entities {
  readonly threads: Map<string, ThreadState>;
  readonly comments: Map<string, CommentState>;
  readonly deletedCommentIds: Set<string>;
}

export class Draft implements Entities {
  readonly threads: Map<string, ThreadState>;
  readonly comments: Map<string, CommentState>;
  readonly deletedCommentIds: Set<string>;

  readonly #owned: WeakSet<object> | null;

  private constructor(entities: Entities, owned: WeakSet<object> | null) {
    this.threads = entities.threads;
    this.comments = entities.comments;
    this.deletedCommentIds = entities.deletedCommentIds;
    this.#owned = owned;
  }

  static live(entities: Entities) {
    return new Draft(entities, /* owned= */ null);
  }

  static fork(base: Entities) {
    return new Draft(
      {
        threads: new Map(base.threads),
        comments: new Map(base.comments),
        deletedCommentIds: new Set(base.deletedCommentIds),
      },
      new WeakSet(),
    );
  }

  apply({actorId, actor, createdAt, payload}: OptimisticEvent) {
    switch (payload.$type) {
      case 'thread.opened': {
        if (this.threads.has(payload.threadId)) {
          throw new Error(`Thread already exists: ${payload.threadId}`);
        }

        this.#own(this.threads, {
          id: payload.threadId,
          anchor: payload.anchor,
          actorId,
          actor,
          resolved: false,
          commentIds: [],
          createdAt,
        });
        break;
      }
      case 'thread.resolved': {
        const thread = this.#getThread(payload.threadId);
        if (thread.resolved) {
          throw new Error(`Thread already resolved: ${payload.threadId}`);
        }

        this.#writableThread(thread).resolved = true;
        break;
      }
      case 'comment.created': {
        const thread = this.#getThread(payload.threadId);
        if (
          this.comments.has(payload.commentId) ||
          this.deletedCommentIds.has(payload.commentId)
        ) {
          throw new Error(`Comment already exists: ${payload.commentId}`);
        }

        this.#own(this.comments, {
          id: payload.commentId,
          threadId: payload.threadId,
          actorId,
          actor,
          body: payload.body,
          createdAt,
        });
        this.#writableThread(thread).commentIds.push(payload.commentId);
        break;
      }
      case 'comment.edited': {
        const comment = this.#getComment(payload.commentId);

        this.#writableComment(comment).body = payload.body;
        break;
      }
      case 'comment.deleted': {
        const comment = this.#getComment(payload.commentId);
        const thread = this.#writableThread(this.#getThread(comment.threadId));

        thread.commentIds = thread.commentIds.filter(
          (id) => id !== payload.commentId,
        );
        this.comments.delete(payload.commentId);
        this.deletedCommentIds.add(payload.commentId);
        break;
      }
      default:
        payload satisfies never;
    }
  }

  #getThread(threadId: string) {
    const thread = this.threads.get(threadId);
    if (!isDefined(thread)) {
      throw new Error(`Thread not found: ${threadId}`);
    }
    return thread;
  }

  #getComment(commentId: string) {
    if (this.deletedCommentIds.has(commentId)) {
      throw new Error(`Comment already deleted: ${commentId}`);
    }

    const comment = this.comments.get(commentId);
    if (!isDefined(comment)) {
      throw new Error(`Comment not found: ${commentId}`);
    }
    return comment;
  }

  #writableThread(thread: ThreadState) {
    return this.#isWritable(thread)
      ? thread
      : this.#own(this.threads, {
          ...thread,
          commentIds: [...thread.commentIds],
        });
  }

  #writableComment(comment: CommentState) {
    return this.#isWritable(comment)
      ? comment
      : this.#own(this.comments, {...comment});
  }

  #isWritable(entity: object) {
    return this.#owned === null || this.#owned.has(entity);
  }

  #own<T extends {readonly id: string}>(map: Map<string, T>, entity: T) {
    this.#owned?.add(entity);
    map.set(entity.id, entity);
    return entity;
  }
}

export function isType<T extends ShareEventPayload['$type']>(
  type: T,
  payload: ShareEventPayload,
): payload is Extract<ShareEventPayload, {$type: T}> {
  return payload.$type === type;
}

function isSupersededBy(
  pending: ShareEventPayload,
  confirmed: ShareEventPayload,
) {
  return (
    pending.$type === confirmed.$type &&
    subjectIdFromPayload(pending) === subjectIdFromPayload(confirmed)
  );
}
