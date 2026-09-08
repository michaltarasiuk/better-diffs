import {assert} from '@/lib/utils/assert';
import {isDefined} from '@/lib/utils/defined';

import type {Anchor, ShareEvent} from './schemas';
import type {SerializedEditorState} from 'lexical';

interface ThreadState {
  readonly id: string;
  readonly anchor: Anchor;
  readonly actorId: string;
  readonly resolved: boolean;
  readonly commentIds: readonly string[];
  readonly createdAt: string;
}

interface CommentState {
  readonly id: string;
  readonly threadId: string;
  readonly actorId: string;
  readonly body: SerializedEditorState;
  readonly deleted: boolean;
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

export function foldEvents(events: readonly ShareEvent[]) {
  let state = EMPTY_FOLDED_STATE;
  for (const event of events) {
    state = applyEvent(state, event);
  }
  return state;
}

function applyEvent(
  state: FoldedShareState,
  event: ShareEvent,
): FoldedShareState {
  const {payload, actorId, createdAt} = event;

  switch (payload.$type) {
    case 'thread.opened': {
      assert(
        !state.threads.has(payload.threadId),
        `Thread already opened: ${payload.threadId}`,
      );

      const threads = new Map(state.threads);
      threads.set(payload.threadId, {
        id: payload.threadId,
        anchor: payload.anchor,
        actorId,
        resolved: false,
        commentIds: [],
        createdAt,
      });
      return {...state, threads};
    }

    case 'comment.created': {
      const thread = state.threads.get(payload.threadId);
      assert(
        isDefined(thread),
        `Comment on unknown thread: ${payload.threadId}`,
      );

      assert(
        !state.comments.has(payload.commentId),
        `Comment already created: ${payload.commentId}`,
      );

      const threads = new Map(state.threads);
      const comments = new Map(state.comments);
      threads.set(payload.threadId, appendCommentId(thread, payload.commentId));

      comments.set(payload.commentId, {
        id: payload.commentId,
        threadId: payload.threadId,
        actorId,
        body: payload.body,
        deleted: false,
        createdAt,
      });

      return {...state, threads, comments};
    }

    case 'comment.edited': {
      const comment = state.comments.get(payload.commentId);
      assert(isDefined(comment), `Comment not found: ${payload.commentId}`);

      assert(!comment.deleted, `Comment already deleted: ${payload.commentId}`);

      const comments = new Map(state.comments);
      comments.set(payload.commentId, {...comment, body: payload.body});
      return {...state, comments};
    }

    case 'comment.deleted': {
      const comment = state.comments.get(payload.commentId);
      assert(isDefined(comment), `Comment not found: ${payload.commentId}`);

      assert(!comment.deleted, `Comment already deleted: ${payload.commentId}`);

      const comments = new Map(state.comments);
      comments.set(payload.commentId, {...comment, deleted: true});
      return {...state, comments};
    }

    case 'thread.resolved': {
      const thread = state.threads.get(payload.threadId);
      assert(isDefined(thread), `Thread not found: ${payload.threadId}`);

      assert(!thread.resolved, `Thread already resolved: ${payload.threadId}`);

      const threads = new Map(state.threads);
      threads.set(payload.threadId, {...thread, resolved: true});
      return {...state, threads};
    }

    default:
      payload satisfies never;
      return state;
  }
}

function appendCommentId(thread: ThreadState, commentId: string): ThreadState {
  assert(
    !thread.commentIds.includes(commentId),
    `Comment already on thread: ${commentId}`,
  );

  return {...thread, commentIds: [...thread.commentIds, commentId]};
}
