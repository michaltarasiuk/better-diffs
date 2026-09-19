import type {Session} from '@/auth/auth';
import type {
  Anchor,
  CommentCreatedPayload,
  CommentDeletedPayload,
  CommentEditedPayload,
  OpenThreadInput,
  ShareEvent,
  ShareEventPayload,
  ThreadOpenedPayload,
  ThreadResolvedPayload,
} from '@/events/schemas';
import {subjectIdFromPayload} from '@/events/schemas';
import type {OptimisticEvent} from '@/events/share-state';
import {
  COMMENT_ID,
  CREATED_AT,
  EVENT_ID,
  SHARE_ID,
  THREAD_ID,
  USER_ID,
} from '@/testing/ids';
import {createLexicalBody} from '@/testing/lexical';

export {createLexicalBody} from '@/testing/lexical';

const DEFAULT_ANCHOR = {
  shareId: SHARE_ID,
  filePath: 'file.txt',
  side: 'additions',
  line: 1,
} as const satisfies Anchor;

export function createAnchor(partial: Partial<Anchor> = {}): Anchor {
  return {
    ...DEFAULT_ANCHOR,
    ...partial,
  };
}

export function createThreadOpened(
  partial: Partial<ThreadOpenedPayload> &
    Pick<ThreadOpenedPayload, 'threadId'> = {threadId: THREAD_ID},
) {
  const {threadId, anchor, ...rest} = partial;
  return {
    $type: 'thread.opened',
    threadId,
    anchor: createAnchor(anchor),
    ...rest,
  } satisfies ThreadOpenedPayload;
}

export function createThreadResolved(
  partial: Partial<ThreadResolvedPayload> &
    Pick<ThreadResolvedPayload, 'threadId'> = {threadId: THREAD_ID},
) {
  return {
    $type: 'thread.resolved',
    ...partial,
  } satisfies ThreadResolvedPayload;
}

export function createCommentCreated(
  partial: Partial<CommentCreatedPayload> &
    Pick<CommentCreatedPayload, 'threadId' | 'commentId'> = {
    threadId: THREAD_ID,
    commentId: COMMENT_ID,
  },
) {
  const {body, ...rest} = partial;
  return {
    $type: 'comment.created',
    body: body ?? createLexicalBody(),
    ...rest,
  } satisfies CommentCreatedPayload;
}

export function createCommentEdited(
  partial: Partial<CommentEditedPayload> &
    Pick<CommentEditedPayload, 'commentId'> = {commentId: COMMENT_ID},
) {
  const {body, ...rest} = partial;
  return {
    $type: 'comment.edited',
    body: body ?? createLexicalBody(),
    ...rest,
  } satisfies CommentEditedPayload;
}

export function createCommentDeleted(
  partial: Partial<CommentDeletedPayload> &
    Pick<CommentDeletedPayload, 'commentId'> = {commentId: COMMENT_ID},
) {
  return {
    $type: 'comment.deleted',
    ...partial,
  } satisfies CommentDeletedPayload;
}

export function createOptimisticEvent(
  payload: ShareEventPayload,
  partial: Partial<OptimisticEvent> = {},
) {
  return {
    actorId: USER_ID,
    createdAt: CREATED_AT,
    payload,
    ...partial,
  } satisfies OptimisticEvent;
}

export function createShareEvent(partial: Partial<ShareEvent> = {}) {
  const payload =
    partial.payload ?? createThreadResolved({threadId: THREAD_ID});

  return {
    id: EVENT_ID,
    shareId: SHARE_ID,
    seq: 1,
    type: payload.$type,
    subjectId: subjectIdFromPayload(payload),
    actorId: USER_ID,
    payload,
    createdAt: CREATED_AT,
    ...partial,
  } satisfies ShareEvent;
}

export function createResolvedShareEvent(
  seq: number,
  shareId: string = SHARE_ID,
) {
  return createShareEvent({
    id: `event-${shareId}-${seq}`,
    shareId,
    seq,
    payload: createThreadResolved({threadId: THREAD_ID}),
  });
}

export function createEventLog(
  options: {
    shareId?: string;
    actorId?: string;
    createdAt?: string;
  } = {},
) {
  let seq = 0;
  const shareId = options.shareId ?? SHARE_ID;
  const actorId = options.actorId ?? USER_ID;
  const createdAt = options.createdAt ?? CREATED_AT;

  return (...payloads: readonly ShareEventPayload[]): ShareEvent[] =>
    payloads.map((payload) => {
      seq += 1;
      return createShareEvent({
        id: `event-${seq}`,
        shareId,
        seq,
        type: payload.$type,
        subjectId: subjectIdFromPayload(payload),
        actorId,
        payload,
        createdAt,
      });
    });
}

export function createOpenThreadInput(partial: Partial<OpenThreadInput> = {}) {
  return {
    shareId: SHARE_ID,
    threadId: THREAD_ID,
    commentId: COMMENT_ID,
    body: createLexicalBody(),
    anchor: createAnchor({line: 3}),
    ...partial,
  } satisfies OpenThreadInput;
}

export function createOpenThreadPayloads(input: OpenThreadInput) {
  return [
    createThreadOpened({
      threadId: input.threadId,
      anchor: input.anchor,
    }),
    createCommentCreated({
      threadId: input.threadId,
      commentId: input.commentId,
      body: input.body,
    }),
  ] satisfies ShareEventPayload[];
}

export function createSession(partial: Partial<Session> = {}) {
  return {
    user: {id: USER_ID},
    ...partial,
  } as Session;
}
