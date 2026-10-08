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

import {newId} from '@/utils/new-id';

export const CREATED_AT = new Date(0).toISOString();

export function createActor(overrides?: Partial<Actor>) {
  return {
    name: 'Name',
    image: null,
    ...overrides,
  } satisfies Actor;
}

export function createAnchor(overrides?: Partial<Anchor>) {
  return {
    shareId: newId(),
    filePath: 'file.txt',
    side: 'additions',
    line: 1,
    ...overrides,
  } satisfies Anchor;
}

export function createLexicalBody(text = 'value') {
  return {text} as unknown as SerializedEditorState;
}

export function createThreadOpened(
  overrides: Partial<ThreadOpenedPayload> = {},
) {
  return {
    $type: 'thread.opened',
    anchor: createAnchor(),
    threadId: newId(),
    ...overrides,
  } satisfies ThreadOpenedPayload;
}

export function createThreadResolved(
  overrides: Partial<ThreadResolvedPayload> = {},
) {
  return {
    $type: 'thread.resolved',
    threadId: newId(),
    ...overrides,
  } satisfies ThreadResolvedPayload;
}

export function createCommentCreated(
  overrides: Partial<CommentCreatedPayload> = {},
) {
  return {
    $type: 'comment.created',
    body: createLexicalBody(),
    commentId: newId(),
    threadId: newId(),
    ...overrides,
  } satisfies CommentCreatedPayload;
}

export function createCommentEdited(
  overrides: Partial<CommentEditedPayload> = {},
) {
  return {
    $type: 'comment.edited',
    body: createLexicalBody(),
    commentId: newId(),
    ...overrides,
  } satisfies CommentEditedPayload;
}

export function createCommentDeleted(
  overrides: Partial<CommentDeletedPayload> = {},
) {
  return {
    $type: 'comment.deleted',
    commentId: newId(),
    ...overrides,
  } satisfies CommentDeletedPayload;
}

export function createShareEvent(
  payload: ShareEventPayload,
  overrides: Partial<Omit<ShareEvent, 'type' | 'subjectId' | 'payload'>> = {},
) {
  return {
    id: newId(),
    shareId: newId(),
    seq: 1,
    type: payload.$type,
    subjectId: subjectIdFromPayload(payload),
    actorId: newId(),
    actor: createActor(),
    payload,
    createdAt: CREATED_AT,
    ...overrides,
  } satisfies ShareEvent;
}
