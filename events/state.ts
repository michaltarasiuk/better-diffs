import type {SerializedEditorState} from 'lexical';

import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';
import type {Anchor, ShareEvent, ShareEventPayload} from './schemas';

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
  readonly createdAt: string;
}

export interface FoldedShareState {
  readonly threads: ReadonlyMap<string, ThreadState>;
  readonly comments: ReadonlyMap<string, CommentState>;
  readonly deletedCommentIds: ReadonlySet<string>;
  readonly pendingIds: ReadonlySet<string>;
  readonly version: number;
}

export interface OptimisticEvent {
  readonly actorId: string;
  readonly createdAt: string;
  readonly payload: ShareEventPayload;
}

export const EMPTY_FOLDED_STATE: FoldedShareState = {
  threads: new Map(),
  comments: new Map(),
  deletedCommentIds: new Set(),
  pendingIds: new Set(),
  version: 0,
};

export function foldEvents(events: readonly ShareEvent[]) {
  const state = new ShareState();
  state.ingest(events);
  return state.getSnapshot();
}

export class ShareState {
  readonly threads = new Map<string, ThreadState>();
  readonly comments = new Map<string, CommentState>();
  readonly deletedCommentIds = new Set<string>();

  #snapshot: FoldedShareState | null = null;
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

  getSnapshot = (): FoldedShareState => {
    if (!this.#snapshot) {
      if (!this.#pending.size) {
        this.#snapshot = {
          threads: this.threads,
          comments: this.comments,
          deletedCommentIds: this.deletedCommentIds,
          pendingIds: new Set(),
          version: this.#version,
        };
      } else {
        this.#snapshot = this.#mergePending();
      }
    }

    return this.#snapshot;
  };

  ingest(events: readonly ShareEvent[]) {
    let changed = false;

    for (const event of events) {
      if (event.seq <= this.#latestSeq) {
        throw new Error(`Invalid event seq: ${event.seq}`);
      }

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

    const pendingId = newId();
    this.#pending.set(pendingId, event);

    this.#commit();

    return pendingId;
  }

  optimisticAll(events: readonly OptimisticEvent[]) {
    const pendingIds: string[] = [];
    for (const event of events) {
      this.#assertOptimistic(event);

      const pendingId = newId();
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

  #commit() {
    this.#snapshot = null;
    this.#version += 1;
    for (const subscriber of this.#subscribers) {
      subscriber();
    }
  }

  #apply(event: ShareEvent) {
    const {actorId, payload, createdAt} = event;

    switch (payload.$type) {
      case 'thread.opened': {
        const threadAlreadyOpened = this.threads.has(payload.threadId);
        if (threadAlreadyOpened) {
          throw new Error(`Thread already exists: ${payload.threadId}`);
        }

        this.threads.set(payload.threadId, {
          id: payload.threadId,
          anchor: payload.anchor,
          actorId,
          resolved: false,
          commentIds: [],
          createdAt,
        });
        break;
      }
      case 'thread.resolved': {
        const thread = this.threads.get(payload.threadId);
        if (!isDefined(thread)) {
          throw new Error(`Thread not found: ${payload.threadId}`);
        } else if (thread.resolved) {
          throw new Error(`Thread already resolved: ${payload.threadId}`);
        }

        thread.resolved = true;
        break;
      }
      case 'comment.created': {
        const thread = this.threads.get(payload.threadId);
        if (!isDefined(thread)) {
          throw new Error(`Thread not found: ${payload.threadId}`);
        }

        const alreadyCreated =
          this.comments.has(payload.commentId) ||
          this.deletedCommentIds.has(payload.commentId);
        if (alreadyCreated) {
          throw new Error(`Comment already exists: ${payload.commentId}`);
        }

        const commentAlreadyOnThread = thread.commentIds.includes(
          payload.commentId,
        );
        if (commentAlreadyOnThread) {
          throw new Error(`Comment already exists: ${payload.commentId}`);
        }

        this.comments.set(payload.commentId, {
          id: payload.commentId,
          threadId: payload.threadId,
          actorId,
          body: payload.body,
          createdAt,
        });
        thread.commentIds.push(payload.commentId);
        break;
      }
      case 'comment.edited': {
        const commentAlreadyDeleted = this.deletedCommentIds.has(
          payload.commentId,
        );
        if (commentAlreadyDeleted) {
          throw new Error(`Comment already deleted: ${payload.commentId}`);
        }

        const comment = this.comments.get(payload.commentId);
        if (!isDefined(comment)) {
          throw new Error(`Comment not found: ${payload.commentId}`);
        }

        comment.body = payload.body;
        break;
      }
      case 'comment.deleted': {
        this.#deleteComment(payload.commentId);
        break;
      }
      default:
        payload satisfies never;
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
    const confirmedThreads = this.threads;
    const confirmedComments = this.comments;

    const threads = new Map(confirmedThreads);
    const comments = new Map(confirmedComments);
    const deletedCommentIds = new Set(this.deletedCommentIds);
    const pendingIds = new Set<string>();

    for (const event of this.#pending.values()) {
      const {actorId, createdAt, payload} = event;

      switch (payload.$type) {
        case 'thread.opened': {
          threads.set(payload.threadId, {
            id: payload.threadId,
            anchor: payload.anchor,
            actorId,
            resolved: false,
            commentIds: [],
            createdAt,
          });
          pendingIds.add(payload.threadId);
          break;
        }
        case 'thread.resolved': {
          const thread = cloneThread(payload.threadId);
          thread.resolved = true;
          pendingIds.add(payload.threadId);
          break;
        }
        case 'comment.created': {
          const thread = cloneThread(payload.threadId);
          comments.set(payload.commentId, {
            id: payload.commentId,
            threadId: payload.threadId,
            actorId,
            body: payload.body,
            createdAt,
          });
          thread.commentIds.push(payload.commentId);
          pendingIds.add(payload.commentId);
          break;
        }
        case 'comment.edited': {
          const comment = cloneComment(payload.commentId);
          comment.body = payload.body;
          pendingIds.add(payload.commentId);
          break;
        }
        case 'comment.deleted': {
          const comment = comments.get(payload.commentId);
          if (!isDefined(comment)) {
            throw new Error(`Comment not found: ${payload.commentId}`);
          }

          const thread = cloneThread(comment.threadId);
          thread.commentIds = thread.commentIds.filter(
            (id) => id !== payload.commentId,
          );

          comments.delete(payload.commentId);
          deletedCommentIds.add(payload.commentId);
          pendingIds.add(payload.commentId);
          break;
        }
        default:
          payload satisfies never;
      }
    }

    return {
      threads,
      comments,
      deletedCommentIds,
      pendingIds,
      version: this.#version,
    };

    function cloneThread(threadId: string) {
      const thread = threads.get(threadId);
      if (!isDefined(thread)) {
        throw new Error(`Thread not found: ${threadId}`);
      }
      if (confirmedThreads.get(threadId) === thread) {
        const cloned = structuredClone(thread);
        threads.set(threadId, cloned);
        return cloned;
      }
      return thread;
    }

    function cloneComment(commentId: string) {
      const comment = comments.get(commentId);
      if (!isDefined(comment)) {
        throw new Error(`Comment not found: ${commentId}`);
      }
      if (confirmedComments.get(commentId) === comment) {
        const cloned = structuredClone(comment);
        comments.set(commentId, cloned);
        return cloned;
      }
      return comment;
    }
  }

  #assertOptimistic(event: OptimisticEvent) {
    const {payload} = event;

    switch (payload.$type) {
      case 'thread.opened': {
        const threadAlreadyOpened = this.#hasThread(payload.threadId);
        if (threadAlreadyOpened) {
          throw new Error(`Thread already exists: ${payload.threadId}`);
        }
        break;
      }
      case 'thread.resolved': {
        const thread = this.#getThread(payload.threadId);
        if (!isDefined(thread)) {
          throw new Error(`Thread not found: ${payload.threadId}`);
        } else if (thread.resolved) {
          throw new Error(`Thread already resolved: ${payload.threadId}`);
        }
        break;
      }
      case 'comment.created': {
        const threadUnknown = !this.#hasThread(payload.threadId);
        if (threadUnknown) {
          throw new Error(`Thread not found: ${payload.threadId}`);
        }

        const alreadyCreated =
          this.#hasComment(payload.commentId) ||
          this.deletedCommentIds.has(payload.commentId);
        if (alreadyCreated) {
          throw new Error(`Comment already exists: ${payload.commentId}`);
        }
        break;
      }
      case 'comment.edited': {
        const commentAlreadyDeleted = this.#isCommentDeleted(payload.commentId);
        if (commentAlreadyDeleted) {
          throw new Error(`Comment already deleted: ${payload.commentId}`);
        }

        const commentNotFound = !this.#hasComment(payload.commentId);
        if (commentNotFound) {
          throw new Error(`Comment not found: ${payload.commentId}`);
        }
        break;
      }
      case 'comment.deleted': {
        const commentAlreadyDeleted = this.#isCommentDeleted(payload.commentId);
        if (commentAlreadyDeleted) {
          throw new Error(`Comment already deleted: ${payload.commentId}`);
        }

        const commentNotFound = !this.#hasComment(payload.commentId);
        if (commentNotFound) {
          throw new Error(`Comment not found: ${payload.commentId}`);
        }
        break;
      }
      default:
        payload satisfies never;
    }
  }

  #getThread(threadId: string) {
    let thread = this.threads.get(threadId);

    for (const event of this.#pending.values()) {
      const {actorId, createdAt, payload} = event;

      if (isType('thread.opened', payload) && payload.threadId === threadId) {
        thread = {
          id: threadId,
          anchor: payload.anchor,
          actorId,
          resolved: false,
          commentIds: [],
          createdAt,
        };
        continue;
      }
      if (
        isType('thread.resolved', payload) &&
        payload.threadId === threadId &&
        isDefined(thread)
      ) {
        thread = structuredClone(thread);
        thread.resolved = true;
      }
    }

    return thread;
  }

  #hasThread(threadId: string) {
    return isDefined(this.#getThread(threadId));
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
          createdAt: event.createdAt,
        };
        continue;
      }
      if (
        isType('comment.edited', payload) &&
        payload.commentId === commentId &&
        isDefined(comment)
      ) {
        comment = structuredClone(comment);
        comment.body = payload.body;
        continue;
      }
      if (
        isType('comment.deleted', payload) &&
        payload.commentId === commentId
      ) {
        comment = undefined;
      }
    }

    return comment;
  }

  #isCommentDeleted(commentId: string) {
    const commentDeleted = this.deletedCommentIds.has(commentId);
    if (commentDeleted) {
      return true;
    }

    let seenCreate = this.comments.has(commentId);
    for (const event of this.#pending.values()) {
      const {payload} = event;

      if (
        isType('comment.created', payload) &&
        payload.commentId === commentId
      ) {
        seenCreate = true;
      } else if (
        isType('comment.deleted', payload) &&
        payload.commentId === commentId &&
        seenCreate
      ) {
        return true;
      }
    }
    return false;
  }

  #hasComment(commentId: string) {
    return isDefined(this.#getComment(commentId));
  }

  #deleteComment(commentId: string) {
    const comment = this.comments.get(commentId);
    if (!isDefined(comment)) {
      const commentAlreadyDeleted = this.deletedCommentIds.has(commentId);
      if (commentAlreadyDeleted) {
        throw new Error(`Comment already deleted: ${commentId}`);
      }
      throw new Error(`Comment not found: ${commentId}`);
    }

    const thread = this.threads.get(comment.threadId);
    if (!isDefined(thread)) {
      throw new Error(`Thread not found: ${comment.threadId}`);
    }

    thread.commentIds = thread.commentIds.filter((id) => id !== commentId);
    this.comments.delete(commentId);
    this.deletedCommentIds.add(commentId);
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
