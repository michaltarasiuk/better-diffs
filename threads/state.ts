import {isDefined} from '@/utils/is-defined';

import {threadError} from './errors';
import type {
  Actor,
  Change,
  Comment,
  ShareRows,
  ShareSnapshot,
  Thread,
} from './schemas';

export interface ShareState {
  readonly revision: number;
  readonly threads: ReadonlyMap<string, Thread>;
  readonly comments: ReadonlyMap<string, Comment>;
  readonly version: number;
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
    version: 0,
  };
}

export function receive(state: ShareState, snapshot: ShareSnapshot) {
  if (snapshot.revision <= state.revision) {
    return state;
  }
  return {...initialState(snapshot), version: state.version + 1};
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
        resolved: false,
        createdAt,
      });
      break;
    case 'resolveThread': {
      const thread = threads.get(change.threadId);
      if (isDefined(thread)) {
        threads.set(thread.id, {...thread, resolved: true});
      }
      break;
    }
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
    case 'editComment': {
      const comment = comments.get(change.commentId);
      if (isDefined(comment)) {
        comments.set(comment.id, {...comment, body: change.body});
      }
      break;
    }
    case 'deleteComment':
      comments.delete(change.commentId);
      break;
    default:
      change satisfies never;
  }

  return {...state, threads, comments, version: state.version + 1};
}

export function check(
  rows: ShareRows,
  actorId: string,
  changes: readonly Change[],
) {
  const resolvedById = new Map(
    rows.threads.map((thread) => [thread.id, thread.resolved]),
  );
  const commentById = new Map(
    rows.comments.map(({id, threadId, actorId}) => [id, {threadId, actorId}]),
  );
  const commentCountById = new Map<string, number>();
  for (const {threadId} of rows.comments) {
    commentCountById.set(threadId, (commentCountById.get(threadId) ?? 0) + 1);
  }

  function checkOpenThread(threadId: string) {
    const resolved = resolvedById.get(threadId);
    if (!isDefined(resolved)) {
      return threadError('THREAD_NOT_FOUND', `Thread not found: ${threadId}`);
    }
    if (resolved) {
      return threadError(
        'THREAD_RESOLVED',
        `Thread already resolved: ${threadId}`,
      );
    }
    return undefined;
  }

  function checkOwnComment(commentId: string) {
    const comment = commentById.get(commentId);
    if (!isDefined(comment)) {
      return threadError(
        'COMMENT_NOT_FOUND',
        `Comment not found: ${commentId}`,
      );
    }
    if (comment.actorId !== actorId) {
      return threadError(
        'NOT_OWNER',
        `${commentId} not owned by actor: ${actorId}`,
      );
    }
    return undefined;
  }

  function checkChange(change: Change) {
    switch (change.type) {
      case 'openThread':
        if (resolvedById.has(change.threadId)) {
          return threadError(
            'THREAD_ALREADY_EXISTS',
            `Thread already exists: ${change.threadId}`,
          );
        }
        resolvedById.set(change.threadId, false);
        return undefined;
      case 'resolveThread': {
        const error = checkOpenThread(change.threadId);
        if (isDefined(error)) {
          return error;
        }
        resolvedById.set(change.threadId, true);
        return undefined;
      }
      case 'createComment': {
        const error = checkOpenThread(change.threadId);
        if (isDefined(error)) {
          return error;
        }
        if (commentById.has(change.commentId)) {
          return threadError(
            'COMMENT_ALREADY_EXISTS',
            `Comment already exists: ${change.commentId}`,
          );
        }
        commentById.set(change.commentId, {threadId: change.threadId, actorId});
        commentCountById.set(
          change.threadId,
          (commentCountById.get(change.threadId) ?? 0) + 1,
        );
        return undefined;
      }
      case 'editComment':
        return checkOwnComment(change.commentId);
      case 'deleteComment': {
        const error = checkOwnComment(change.commentId);
        if (isDefined(error)) {
          return error;
        }
        const {threadId} = commentById.get(change.commentId)!;
        const commentCount = commentCountById.get(threadId) ?? 0;
        if (commentCount <= 1) {
          return threadError(
            'LAST_COMMENT',
            `Cannot delete the last comment of thread: ${threadId}`,
          );
        }
        commentById.delete(change.commentId);
        commentCountById.set(threadId, commentCount - 1);
        return undefined;
      }
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
