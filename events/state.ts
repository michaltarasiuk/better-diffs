import type {SerializedEditorState} from 'lexical';

import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';

import {EventError, isEventError} from './errors';
import {
  type Actor,
  type Anchor,
  type ShareEvent,
  type ShareEventPayload,
  subjectIdFromPayload,
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

export class ShareState implements Entities {
  #confirmed: Entities = {
    threads: new Map(),
    comments: new Map(),
    deletedCommentIds: new Set(),
  };
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

  get threads() {
    return this.#confirmed.threads;
  }

  get comments() {
    return this.#confirmed.comments;
  }

  get deletedCommentIds() {
    return this.#confirmed.deletedCommentIds;
  }

  get latestSeq() {
    return this.#latestSeq;
  }

  getSnapshot = () => {
    this.#snapshot ??= this.#fold();
    return this.#snapshot;
  };

  ingest(events: readonly ShareEvent[]) {
    if (events.length === 0) {
      return false;
    }

    const draft = Draft.fork(this.#confirmed);
    try {
      for (const event of events) {
        const expectedSeq = this.#latestSeq + 1;
        if (event.seq !== expectedSeq) {
          throw new EventError(
            'UNEXPECTED_SEQ',
            `Expected event seq ${expectedSeq}, got ${event.seq}`,
          );
        }
        this.#latestSeq = event.seq;

        draft.apply(event);
        this.#reconcilePending(event.payload);
      }
    } finally {
      this.#confirmed = draft;
      this.#dropStalePending();
      this.#commit();
    }
    return true;
  }

  optimistic(event: OptimisticEvent) {
    this.#draftWithPending().apply(event);

    const pendingId = this.#addPending(event);
    this.#commit();
    return pendingId;
  }

  optimisticAll(events: readonly OptimisticEvent[]) {
    if (events.length === 0) {
      return [];
    }

    const draft = this.#draftWithPending();
    for (const event of events) {
      draft.apply(event);
    }

    const pendingIds = events.map((event) => this.#addPending(event));
    this.#commit();
    return pendingIds;
  }

  #addPending(event: OptimisticEvent) {
    const pendingId = newId();
    this.#pending.set(pendingId, event);
    return pendingId;
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
      this.#pending.size > 0 ? this.#draftWithPending() : this.#confirmed;
    const pendingIds = new Set(
      this.#pending.values().map(({payload}) => subjectIdFromPayload(payload)),
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
    const draft = Draft.fork(this.#confirmed);
    for (const event of this.#pending.values()) {
      draft.apply(event);
    }
    return draft;
  }

  #reconcilePending(confirmed: ShareEventPayload) {
    for (const [pendingId, {payload}] of this.#pending) {
      if (isSupersededBy(payload, confirmed)) {
        this.#pending.delete(pendingId);
        break;
      }
    }
  }

  #dropStalePending() {
    const draft = Draft.fork(this.#confirmed);
    for (const [pendingId, event] of this.#pending) {
      try {
        draft.apply(event);
      } catch (error) {
        if (!isEventError(error)) {
          throw error;
        }
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

  readonly #owned = new WeakSet<object>();

  private constructor(base: Entities) {
    this.threads = new Map(base.threads);
    this.comments = new Map(base.comments);
    this.deletedCommentIds = new Set(base.deletedCommentIds);
  }

  static fork(base: Entities) {
    return new Draft(base);
  }

  apply({actorId, actor, createdAt, payload}: OptimisticEvent) {
    switch (payload.$type) {
      case 'thread.opened': {
        const threadAlreadyExists = this.threads.has(payload.threadId);
        if (threadAlreadyExists) {
          throw new EventError(
            'THREAD_ALREADY_EXISTS',
            `Thread already exists: ${payload.threadId}`,
          );
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
        const thread = this.#getOpenThread(payload.threadId);

        this.#writableThread(thread).resolved = true;
        break;
      }
      case 'comment.created': {
        const thread = this.#getOpenThread(payload.threadId);

        const commentAlreadyExists =
          this.comments.has(payload.commentId) ||
          this.deletedCommentIds.has(payload.commentId);
        if (commentAlreadyExists) {
          throw new EventError(
            'COMMENT_ALREADY_EXISTS',
            `Comment already exists: ${payload.commentId}`,
          );
        }

        this.#writableThread(thread).commentIds.push(payload.commentId);
        this.#own(this.comments, {
          id: payload.commentId,
          threadId: payload.threadId,
          actorId,
          actor,
          body: payload.body,
          createdAt,
        });
        break;
      }
      case 'comment.edited': {
        const comment = this.#getComment(payload.commentId);

        this.#assertOwner(comment, actorId);
        this.#writableComment(comment).body = payload.body;
        break;
      }
      case 'comment.deleted': {
        const comment = this.#getComment(payload.commentId);

        this.#assertOwner(comment, actorId);
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
      throw new EventError('THREAD_NOT_FOUND', `Thread not found: ${threadId}`);
    }
    return thread;
  }

  #getOpenThread(threadId: string) {
    const thread = this.#getThread(threadId);
    if (thread.resolved) {
      throw new EventError(
        'THREAD_RESOLVED',
        `Thread already resolved: ${threadId}`,
      );
    }
    return thread;
  }

  #getComment(commentId: string) {
    const commentAlreadyDeleted = this.deletedCommentIds.has(commentId);
    if (commentAlreadyDeleted) {
      throw new EventError(
        'COMMENT_DELETED',
        `Comment already deleted: ${commentId}`,
      );
    }

    const comment = this.comments.get(commentId);
    if (!isDefined(comment)) {
      throw new EventError(
        'COMMENT_NOT_FOUND',
        `Comment not found: ${commentId}`,
      );
    }
    return comment;
  }

  #assertOwner(entity: {id: string; actorId: string}, actorId: string) {
    if (entity.actorId !== actorId) {
      throw new EventError(
        'NOT_OWNER',
        `${entity.id} not owned by actor: ${actorId}`,
      );
    }
  }

  #isWritable(entity: object) {
    return this.#owned.has(entity);
  }

  #own<T extends {readonly id: string}>(entityMap: Map<string, T>, entity: T) {
    this.#owned.add(entity);
    entityMap.set(entity.id, entity);
    return entity;
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
