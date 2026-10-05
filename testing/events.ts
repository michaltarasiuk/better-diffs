import type {SerializedEditorState} from 'lexical';

import {
  subjectIdFromPayload,
  type Actor,
  type Anchor,
  type CommentCreatedPayload,
  type CommentDeletedPayload,
  type CommentEditedPayload,
  type ShareEvent,
  type ShareEventPayload,
  type ThreadOpenedPayload,
  type ThreadResolvedPayload,
} from '@/events/schemas';

import {uuid} from './uuid';

export const CREATED_AT = '1970-01-01T00:00:00.000Z';

export function createActor(overrides: Partial<Actor> = {}): Actor {
  return {
    name: 'Name',
    image: null,
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

export function createLexicalBody(text = 'text') {
  return {text} as unknown as SerializedEditorState;
}

export function createThreadOpened(
  overrides: Partial<ThreadOpenedPayload> = {},
): ThreadOpenedPayload {
  return {
    $type: 'thread.opened',
    threadId: uuid(),
    anchor: createAnchor(),
    ...overrides,
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

export function createCommentCreated(
  overrides: Partial<CommentCreatedPayload> = {},
): CommentCreatedPayload {
  return {
    $type: 'comment.created',
    threadId: uuid(),
    commentId: uuid(),
    body: createLexicalBody(),
    ...overrides,
  };
}

export function createCommentEdited(
  overrides: Partial<CommentEditedPayload> = {},
): CommentEditedPayload {
  return {
    $type: 'comment.edited',
    commentId: uuid(),
    body: createLexicalBody(),
    ...overrides,
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

export function createShareEvent(
  payload: ShareEventPayload,
  overrides: Partial<Omit<ShareEvent, 'payload' | 'type' | 'subjectId'>> = {},
): ShareEvent {
  return {
    id: uuid(),
    shareId: uuid(),
    seq: 1,
    actorId: uuid(),
    actor: createActor(),
    createdAt: CREATED_AT,
    ...overrides,
    type: payload.$type,
    subjectId: subjectIdFromPayload(payload),
    payload,
  };
}
