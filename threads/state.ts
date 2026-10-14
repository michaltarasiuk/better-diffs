import {isDefined} from '@/utils/is-defined';

import {ThreadError, type ThreadErrorReason} from './errors';
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

  switch (change.$type) {
    case 'thread.opened':
      threads.set(change.threadId, {
        id: change.threadId,
        anchor: change.anchor,
        actorId,
        actor,
        resolved: false,
        createdAt,
      });
      break;
    case 'thread.resolved': {
      const thread = threads.get(change.threadId);
      if (isDefined(thread)) {
        threads.set(thread.id, {...thread, resolved: true});
      }
      break;
    }
    case 'comment.created':
      comments.set(change.commentId, {
        id: change.commentId,
        threadId: change.threadId,
        actorId,
        actor,
        body: change.body,
        createdAt,
      });
      break;
    case 'comment.edited': {
      const comment = comments.get(change.commentId);
      if (isDefined(comment)) {
        comments.set(comment.id, {...comment, body: change.body});
      }
      break;
    }
    case 'comment.deleted':
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
  const ownerById = new Map(
    rows.comments.map((comment) => [comment.id, comment.actorId]),
  );

  function checkOpenThread(threadId: string) {
    const resolved = resolvedById.get(threadId);
    if (!isDefined(resolved)) {
      refuse('THREAD_NOT_FOUND', `Thread not found: ${threadId}`);
    }
    if (resolved) {
      refuse('THREAD_RESOLVED', `Thread already resolved: ${threadId}`);
    }
  }

  function checkOwnComment(commentId: string) {
    const ownerId = ownerById.get(commentId);
    if (!isDefined(ownerId)) {
      refuse('COMMENT_NOT_FOUND', `Comment not found: ${commentId}`);
    }
    if (ownerId !== actorId) {
      refuse('NOT_OWNER', `${commentId} not owned by actor: ${actorId}`);
    }
  }

  for (const change of changes) {
    switch (change.$type) {
      case 'thread.opened':
        if (resolvedById.has(change.threadId)) {
          refuse(
            'THREAD_ALREADY_EXISTS',
            `Thread already exists: ${change.threadId}`,
          );
        }
        resolvedById.set(change.threadId, false);
        break;
      case 'thread.resolved':
        checkOpenThread(change.threadId);
        resolvedById.set(change.threadId, true);
        break;
      case 'comment.created':
        checkOpenThread(change.threadId);
        if (ownerById.has(change.commentId)) {
          refuse(
            'COMMENT_ALREADY_EXISTS',
            `Comment already exists: ${change.commentId}`,
          );
        }
        ownerById.set(change.commentId, actorId);
        break;
      case 'comment.edited':
        checkOwnComment(change.commentId);
        break;
      case 'comment.deleted':
        checkOwnComment(change.commentId);
        ownerById.delete(change.commentId);
        break;
      default:
        change satisfies never;
    }
  }
}

function refuse(reason: ThreadErrorReason, message: string): never {
  throw new ThreadError(reason, message);
}
