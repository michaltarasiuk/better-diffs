import type {SerializedEditorState} from 'lexical';

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
import type {OptimisticEvent, ThreadState} from '@/events/share-state';
import {
  COMMENT_ID,
  CREATED_AT,
  EVENT_ID,
  SHARE_ID,
  THREAD_ID,
  USER_ID,
} from '@/testing/ids';

export function createOpenThreadInput(
  overrides: Partial<OpenThreadInput> = {},
) {
  return {
    shareId: SHARE_ID,
    threadId: THREAD_ID,
    commentId: COMMENT_ID,
    body: createLexicalBody(),
    anchor: createAnchor(),
    ...overrides,
  } satisfies OpenThreadInput;
}

export function createThreadState(overrides: Partial<ThreadState> = {}) {
  return {
    id: THREAD_ID,
    anchor: createAnchor(),
    actorId: USER_ID,
    resolved: false,
    commentIds: [],
    createdAt: CREATED_AT,
    ...overrides,
  } satisfies ThreadState;
}

export function createThreadOpened(
  overrides: Partial<ThreadOpenedPayload> = {},
) {
  const {threadId = THREAD_ID, anchor, ...rest} = overrides;
  return {
    $type: 'thread.opened',
    threadId,
    anchor: createAnchor(anchor),
    ...rest,
  } satisfies ThreadOpenedPayload;
}

export function createCommentCreated(
  overrides: Partial<CommentCreatedPayload> = {},
) {
  const {
    threadId = THREAD_ID,
    commentId = COMMENT_ID,
    body = createLexicalBody(),
    ...rest
  } = overrides;
  return {
    $type: 'comment.created',
    threadId,
    commentId,
    body,
    ...rest,
  } satisfies CommentCreatedPayload;
}

export function createCommentEdited(
  overrides: Partial<CommentEditedPayload> = {},
) {
  const {
    commentId = COMMENT_ID,
    body = createLexicalBody(),
    ...rest
  } = overrides;
  return {
    $type: 'comment.edited',
    commentId,
    body,
    ...rest,
  } satisfies CommentEditedPayload;
}

export function createThreadResolved(
  overrides: Partial<ThreadResolvedPayload> = {},
) {
  const {threadId = THREAD_ID, ...rest} = overrides;
  return {
    $type: 'thread.resolved',
    threadId,
    ...rest,
  } satisfies ThreadResolvedPayload;
}

export function createCommentDeleted(
  overrides: Partial<CommentDeletedPayload> = {},
) {
  const {commentId = COMMENT_ID, ...rest} = overrides;
  return {
    $type: 'comment.deleted',
    commentId,
    ...rest,
  } satisfies CommentDeletedPayload;
}

export function createShareEvent(
  payload: ShareEventPayload,
  overrides: Partial<Omit<ShareEvent, 'type' | 'subjectId' | 'payload'>> = {},
) {
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
  } satisfies ShareEvent;
}

export function createOptimisticEvent(
  payload: ShareEventPayload,
  overrides: Partial<OptimisticEvent> = {},
) {
  return {
    actorId: USER_ID,
    createdAt: CREATED_AT,
    payload,
    ...overrides,
  } satisfies OptimisticEvent;
}

export function createLexicalBody(text = 'value') {
  return {text} as unknown as SerializedEditorState;
}

export function createAnchor(overrides: Partial<Anchor> = {}) {
  return {
    ...DEFAULT_ANCHOR,
    ...overrides,
  } satisfies Anchor;
}

const DEFAULT_ANCHOR = {
  shareId: SHARE_ID,
  filePath: 'file.txt',
  side: 'additions',
  line: 1,
} as const satisfies Anchor;
