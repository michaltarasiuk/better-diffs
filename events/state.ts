import {isDefined} from '@/utils/is-defined';

import {EventError, type EventErrorReason} from './errors';
import type {
  Actor,
  Comment,
  ShareEvent,
  ShareEventPayload,
  ShareRecords,
  ShareSnapshot,
  Thread,
} from './schemas';

export interface ThreadState extends Thread {
  readonly commentIds: readonly string[];
}

export type CommentState = Comment;

export interface ShareState {
  readonly seq: number;
  readonly threads: ReadonlyMap<string, ThreadState>;
  readonly comments: ReadonlyMap<string, CommentState>;
  readonly version: number;
}

export interface OptimisticChange {
  readonly actorId: string;
  readonly actor: Actor;
  readonly createdAt: string;
  readonly payload: ShareEventPayload;
}

export function initialState({seq, threads, comments}: ShareSnapshot) {
  const rows = Rows.from({threads, comments});
  return {seq, threads: rows.threads, comments: rows.comments, version: 0};
}

export function ingest(state: ShareState, events: readonly ShareEvent[]) {
  const rows = Rows.copy(state);
  let {seq} = state;

  for (const event of events) {
    if (event.seq <= seq) {
      continue;
    }
    if (event.seq !== seq + 1) {
      break;
    }
    seq = event.seq;

    switch (event.type) {
      case 'thread.opened':
      case 'thread.resolved':
        if (isDefined(event.thread)) {
          rows.putThread(event.thread);
        }
        break;
      case 'comment.created':
      case 'comment.edited':
        if (isDefined(event.comment)) {
          rows.putComment(event.comment);
        }
        break;
      case 'comment.deleted':
        rows.removeComment(event.subjectId);
        break;
      default:
        event satisfies never;
    }
  }

  if (seq === state.seq) {
    return state;
  }
  return {
    seq,
    threads: rows.threads,
    comments: rows.comments,
    version: state.version + 1,
  };
}

export function applyOptimistic(state: ShareState, change: OptimisticChange) {
  const rows = Rows.copy(state);
  rows.apply(change);
  return {
    ...state,
    threads: rows.threads,
    comments: rows.comments,
    version: state.version + 1,
  };
}

export function check(
  records: ShareRecords,
  changes: readonly OptimisticChange[],
) {
  const rows = Rows.from(records);
  const deletedCommentIds = new Set(records.deletedCommentIds);

  for (const change of changes) {
    const {actorId, payload} = change;

    switch (payload.$type) {
      case 'thread.opened':
        if (rows.threads.has(payload.threadId)) {
          refuse(
            'THREAD_ALREADY_EXISTS',
            `Thread already exists: ${payload.threadId}`,
          );
        }
        break;
      case 'thread.resolved':
        getOpenThread(rows, payload.threadId);
        break;
      case 'comment.created':
        getOpenThread(rows, payload.threadId);
        if (
          rows.comments.has(payload.commentId) ||
          deletedCommentIds.has(payload.commentId)
        ) {
          refuse(
            'COMMENT_ALREADY_EXISTS',
            `Comment already exists: ${payload.commentId}`,
          );
        }
        break;
      case 'comment.edited':
      case 'comment.deleted': {
        if (deletedCommentIds.has(payload.commentId)) {
          refuse(
            'COMMENT_DELETED',
            `Comment already deleted: ${payload.commentId}`,
          );
        }

        const comment = rows.comments.get(payload.commentId);
        if (!isDefined(comment)) {
          refuse(
            'COMMENT_NOT_FOUND',
            `Comment not found: ${payload.commentId}`,
          );
        }
        if (comment.actorId !== actorId) {
          refuse('NOT_OWNER', `${comment.id} not owned by actor: ${actorId}`);
        }

        if (payload.$type === 'comment.deleted') {
          deletedCommentIds.add(payload.commentId);
        }
        break;
      }
      default:
        payload satisfies never;
    }

    rows.apply(change);
  }
}

function getOpenThread(rows: Rows, threadId: string) {
  const thread = rows.threads.get(threadId);
  if (!isDefined(thread)) {
    refuse('THREAD_NOT_FOUND', `Thread not found: ${threadId}`);
  }
  if (thread.resolved) {
    refuse('THREAD_RESOLVED', `Thread already resolved: ${threadId}`);
  }
  return thread;
}

function refuse(reason: EventErrorReason, message: string): never {
  throw new EventError(reason, message);
}

class Rows {
  readonly threads: Map<string, ThreadState>;
  readonly comments: Map<string, Comment>;

  private constructor(
    threads: ReadonlyMap<string, ThreadState>,
    comments: ReadonlyMap<string, Comment>,
  ) {
    this.threads = new Map(threads);
    this.comments = new Map(comments);
  }

  static copy({threads, comments}: ShareState) {
    return new Rows(threads, comments);
  }

  static from({threads, comments}: Pick<ShareRecords, 'threads' | 'comments'>) {
    const rows = new Rows(new Map(), new Map());
    for (const thread of threads) {
      rows.putThread(thread);
    }
    for (const comment of comments) {
      rows.putComment(comment);
    }
    return rows;
  }

  putThread(thread: Thread) {
    const commentIds = this.threads.get(thread.id)?.commentIds ?? [];
    this.threads.set(thread.id, {...thread, commentIds});
  }

  putComment(comment: Comment) {
    const thread = this.threads.get(comment.threadId);
    if (isDefined(thread) && !thread.commentIds.includes(comment.id)) {
      this.threads.set(thread.id, {
        ...thread,
        commentIds: [...thread.commentIds, comment.id],
      });
    }
    this.comments.set(comment.id, comment);
  }

  removeComment(commentId: string) {
    const comment = this.comments.get(commentId);
    if (!isDefined(comment)) {
      return;
    }
    this.comments.delete(commentId);

    const thread = this.threads.get(comment.threadId);
    if (isDefined(thread)) {
      this.threads.set(thread.id, {
        ...thread,
        commentIds: thread.commentIds.filter((id) => id !== commentId),
      });
    }
  }

  apply({actorId, actor, createdAt, payload}: OptimisticChange) {
    switch (payload.$type) {
      case 'thread.opened':
        this.putThread({
          id: payload.threadId,
          anchor: payload.anchor,
          actorId,
          actor,
          resolved: false,
          createdAt,
        });
        break;
      case 'thread.resolved': {
        const thread = this.threads.get(payload.threadId);
        if (isDefined(thread)) {
          this.threads.set(thread.id, {...thread, resolved: true});
        }
        break;
      }
      case 'comment.created':
        this.putComment({
          id: payload.commentId,
          threadId: payload.threadId,
          actorId,
          actor,
          body: payload.body,
          createdAt,
        });
        break;
      case 'comment.edited': {
        const comment = this.comments.get(payload.commentId);
        if (isDefined(comment)) {
          this.comments.set(comment.id, {...comment, body: payload.body});
        }
        break;
      }
      case 'comment.deleted':
        this.removeComment(payload.commentId);
        break;
      default:
        payload satisfies never;
    }
  }
}
