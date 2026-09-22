import type {SerializedEditorState} from 'lexical';

import {
  COMMENT_ID,
  CREATED_AT,
  EVENT_ID,
  SHARE_ID,
  THREAD_ID,
  USER_ID,
} from '@/testing/ids';
import {
  type Anchor,
  type CommentCreatedPayload,
  type CommentDeletedPayload,
  type CommentEditedPayload,
  type OpenThreadInput,
  type ShareEvent,
  type ShareEventPayload,
  subjectIdFromPayload,
  type ThreadOpenedPayload,
  type ThreadResolvedPayload,
} from '@/events/schemas';
import type {OptimisticEvent, ThreadState} from '@/events/state';

export function createThreadOpened(
  overrides: Partial<ThreadOpenedPayload> = {},
): ThreadOpenedPayload {
  const {anchor, ...rest} = overrides;

  return {
    $type: 'thread.opened',
    threadId: THREAD_ID,
    anchor: createAnchor(anchor),
    ...rest,
  };
}

export function createThreadResolved(
  overrides: Partial<ThreadResolvedPayload> = {},
): ThreadResolvedPayload {
  return {
    $type: 'thread.resolved',
    threadId: THREAD_ID,
    ...overrides,
  };
}

export function createThreadState(
  overrides: Partial<ThreadState> = {},
): ThreadState {
  const {anchor, ...rest} = overrides;

  return {
    id: THREAD_ID,
    anchor: createAnchor(anchor),
    actorId: USER_ID,
    resolved: false,
    commentIds: [],
    createdAt: CREATED_AT,
    ...rest,
  };
}

export function createOpenThreadInput(
  overrides: Partial<OpenThreadInput> = {},
): OpenThreadInput {
  const {body, anchor, ...rest} = overrides;

  return {
    shareId: SHARE_ID,
    threadId: THREAD_ID,
    commentId: COMMENT_ID,
    body: body ?? createLexicalBody(),
    anchor: createAnchor(anchor),
    ...rest,
  };
}

export function createCommentCreated(
  overrides: Partial<CommentCreatedPayload> = {},
): CommentCreatedPayload {
  const {body, ...rest} = overrides;

  return {
    $type: 'comment.created',
    threadId: THREAD_ID,
    commentId: COMMENT_ID,
    body: body ?? createLexicalBody(),
    ...rest,
  };
}

export function createCommentEdited(
  overrides: Partial<CommentEditedPayload> = {},
): CommentEditedPayload {
  const {body, ...rest} = overrides;

  return {
    $type: 'comment.edited',
    commentId: COMMENT_ID,
    body: body ?? createLexicalBody(),
    ...rest,
  };
}

export function createCommentDeleted(
  overrides: Partial<CommentDeletedPayload> = {},
): CommentDeletedPayload {
  return {
    $type: 'comment.deleted',
    commentId: COMMENT_ID,
    ...overrides,
  };
}

export function createAnchor(overrides: Partial<Anchor> = {}): Anchor {
  return {
    shareId: SHARE_ID,
    filePath: 'file.txt',
    side: 'additions',
    line: 1,
    ...overrides,
  };
}

export function createLexicalBody(text = 'value') {
  return {text} as unknown as SerializedEditorState;
}

export function createShareEvent(
  payload: ShareEventPayload,
  overrides: Partial<ShareEvent> = {},
): ShareEvent {
  return {
    id: EVENT_ID,
    shareId: SHARE_ID,
    seq: 1,
    type: payload.$type,
    subjectId: subjectIdFromPayload(payload),
    actorId: USER_ID,
    payload,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

export function createShareEventLog(
  overrides: Partial<ShareEvent> = {},
): (...payloads: readonly ShareEventPayload[]) => ShareEvent[] {
  const meta = {
    shareId: SHARE_ID,
    actorId: USER_ID,
    createdAt: CREATED_AT,
    ...overrides,
  };
  let seq = 0;

  return (...payloads) =>
    payloads.map((payload) =>
      createShareEvent(payload, {
        id: `event-${++seq}`,
        seq,
        ...meta,
      }),
    );
}

export function createOptimisticEvent(
  payload: ShareEventPayload,
  overrides: Partial<OptimisticEvent> = {},
): OptimisticEvent {
  return {
    actorId: USER_ID,
    createdAt: CREATED_AT,
    payload,
    ...overrides,
  };
}
