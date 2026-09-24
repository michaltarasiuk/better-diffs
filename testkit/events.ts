import type {SerializedEditorState} from 'lexical';

import {uuid} from '@/testkit/uuid';
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

const CREATED_AT = '2026-01-01T00:00:00.000Z';

export function createThreadOpened(
  overrides: Partial<ThreadOpenedPayload> = {},
): ThreadOpenedPayload {
  const {anchor, ...rest} = overrides;

  return {
    $type: 'thread.opened',
    threadId: uuid(),
    anchor: createAnchor(anchor),
    ...rest,
  };
}

export function createThreadResolved(
  overrides: Partial<ThreadResolvedPayload> = {},
): ThreadResolvedPayload {
  return {
    $type: 'thread.resolved',
    threadId: uuid(),
    ...overrides,
  };
}

export function createThreadState(
  overrides: Partial<ThreadState> = {},
): ThreadState {
  const {anchor, ...rest} = overrides;

  return {
    id: uuid(),
    anchor: createAnchor(anchor),
    actorId: uuid(),
    resolved: false,
    commentIds: [],
    createdAt: CREATED_AT,
    ...rest,
  };
}

export function createOpenThreadInput(
  overrides: Partial<OpenThreadInput> = {},
): OpenThreadInput {
  const {body, anchor, shareId: shareIdOverride, ...rest} = overrides;
  const shareId = shareIdOverride ?? uuid();

  return {
    shareId,
    threadId: uuid(),
    commentId: uuid(),
    body: body ?? createLexicalBody(),
    anchor: createAnchor({shareId, ...anchor}),
    ...rest,
  };
}

export function createCommentCreated(
  overrides: Partial<CommentCreatedPayload> = {},
): CommentCreatedPayload {
  const {body, ...rest} = overrides;

  return {
    $type: 'comment.created',
    threadId: uuid(),
    commentId: uuid(),
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
    commentId: uuid(),
    body: body ?? createLexicalBody(),
    ...rest,
  };
}

export function createCommentDeleted(
  overrides: Partial<CommentDeletedPayload> = {},
): CommentDeletedPayload {
  return {
    $type: 'comment.deleted',
    commentId: uuid(),
    ...overrides,
  };
}

export function createAnchor(overrides: Partial<Anchor> = {}): Anchor {
  return {
    shareId: uuid(),
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
    id: uuid(),
    shareId: uuid(),
    seq: 1,
    type: payload.$type,
    subjectId: subjectIdFromPayload(payload),
    actorId: uuid(),
    payload,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

export function createShareEventLog(overrides: Partial<ShareEvent> = {}) {
  let seq = 0;
  const shareId = overrides.shareId ?? uuid();
  const actorId = overrides.actorId ?? uuid();
  const createdAt = overrides.createdAt ?? CREATED_AT;

  return (...payloads: readonly ShareEventPayload[]) =>
    payloads.map((payload) =>
      createShareEvent(payload, {
        id: uuid(),
        seq: ++seq,
        shareId,
        actorId,
        createdAt,
        ...overrides,
      }),
    );
}

export function createOptimisticEvent(
  payload: ShareEventPayload,
  overrides: Partial<OptimisticEvent> = {},
): OptimisticEvent {
  return {
    actorId: uuid(),
    createdAt: CREATED_AT,
    payload,
    ...overrides,
  };
}
