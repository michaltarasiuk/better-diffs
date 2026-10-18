import {isDefined} from '#/utils/is-defined';

import {threadError} from './errors';
import type {
  Actor,
  Change,
  Comment,
  ShareSnapshot,
  StoredIds,
  Thread,
} from './schemas';

export interface ShareState {
  readonly revision: number;
  readonly threads: ReadonlyMap<string, Thread>;
  readonly comments: ReadonlyMap<string, Comment>;
}

export interface OptimisticChange {
  readonly actorId: string;
  readonly actor: Actor;
  readonly createdAt: string;
  readonly change: Change;
}

export function initialState({revision, threads, comments}: ShareSnapshot) {
  return {
    revision,
    threads: new Map(threads.map((thread) => [thread.id, thread])),
    comments: new Map(comments.map((comment) => [comment.id, comment])),
  };
}

export function receive(state: ShareState, snapshot: ShareSnapshot) {
  if (snapshot.revision <= state.revision) {
    return state;
  }
  return initialState(snapshot);
}

export function applyOptimistic(
  state: ShareState,
  {actorId, actor, createdAt, change}: OptimisticChange,
) {
  const threads = new Map(state.threads);
  const comments = new Map(state.comments);

  switch (change.type) {
    case 'openThread':
      threads.set(change.threadId, {
        id: change.threadId,
        anchor: change.anchor,
        actorId,
        actor,
        createdAt,
      });
      break;
    case 'createComment':
      comments.set(change.commentId, {
        id: change.commentId,
        threadId: change.threadId,
        actorId,
        actor,
        body: change.body,
        createdAt,
      });
      break;
    default:
      change satisfies never;
  }

  return {...state, threads, comments};
}

export function check(stored: StoredIds, changes: readonly Change[]) {
  const fileIds = new Set(stored.fileIds);
  const threadIds = new Set(stored.threadIds);
  const otherThreadIds = new Set(stored.otherThreadIds);
  const commentIds = new Set(stored.commentIds);

  function checkChange(change: Change) {
    switch (change.type) {
      case 'openThread':
        if (
          threadIds.has(change.threadId) ||
          otherThreadIds.has(change.threadId)
        ) {
          return threadError(
            'THREAD_ALREADY_EXISTS',
            `Thread already exists: ${change.threadId}`,
          );
        }
        if (!fileIds.has(change.anchor.fileId)) {
          return threadError(
            'FILE_NOT_FOUND',
            `File not found: ${change.anchor.fileId}`,
          );
        }
        threadIds.add(change.threadId);
        return undefined;
      case 'createComment':
        if (!threadIds.has(change.threadId)) {
          return threadError(
            'THREAD_NOT_FOUND',
            `Thread not found: ${change.threadId}`,
          );
        }
        if (commentIds.has(change.commentId)) {
          return threadError(
            'COMMENT_ALREADY_EXISTS',
            `Comment already exists: ${change.commentId}`,
          );
        }
        commentIds.add(change.commentId);
        return undefined;
      default:
        return change satisfies never;
    }
  }

  for (const change of changes) {
    const error = checkChange(change);
    if (isDefined(error)) {
      return error;
    }
  }
  return undefined;
}
