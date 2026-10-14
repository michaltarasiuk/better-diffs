'use server';

import {unauthorized} from 'next/navigation';

import {getSession} from '@/auth/server';
import {appendEvents} from '@/db/events';
import {isDefined} from '@/utils/is-defined';

import {toEventActor} from './actor';
import {EventError} from './errors';
import {
  type CommentCreatedPayload,
  type CommentDeletedPayload,
  type CommentEditedPayload,
  CreateCommentInput,
  DeleteCommentInput,
  EditCommentInput,
  OpenThreadInput,
  ResolveThreadInput,
  type ShareEventPayload,
  type ThreadOpenedPayload,
  type ThreadResolvedPayload,
} from './schemas';
import {check} from './state';

export async function openThread(input: OpenThreadInput) {
  if (!OpenThreadInput.validate(input)) {
    throw new EventError('INVALID_INPUT', 'Invalid open thread input');
  }

  const {shareId, threadId, commentId, body, anchor} = input;
  return appendValidatedEvents(shareId, [
    {$type: 'thread.opened', threadId, anchor},
    {$type: 'comment.created', threadId, commentId, body},
  ] satisfies [ThreadOpenedPayload, CommentCreatedPayload]);
}

export async function resolveThread(input: ResolveThreadInput) {
  if (!ResolveThreadInput.validate(input)) {
    throw new EventError('INVALID_INPUT', 'Invalid resolve thread input');
  }

  const {shareId, threadId} = input;
  return appendValidatedEvents(shareId, [
    {$type: 'thread.resolved', threadId},
  ] satisfies [ThreadResolvedPayload]);
}

export async function createComment(input: CreateCommentInput) {
  if (!CreateCommentInput.validate(input)) {
    throw new EventError('INVALID_INPUT', 'Invalid create comment input');
  }

  const {shareId, threadId, commentId, body} = input;
  return appendValidatedEvents(shareId, [
    {$type: 'comment.created', threadId, commentId, body},
  ] satisfies [CommentCreatedPayload]);
}

export async function editComment(input: EditCommentInput) {
  if (!EditCommentInput.validate(input)) {
    throw new EventError('INVALID_INPUT', 'Invalid edit comment input');
  }

  const {shareId, commentId, body} = input;
  return appendValidatedEvents(shareId, [
    {$type: 'comment.edited', commentId, body},
  ] satisfies [CommentEditedPayload]);
}

export async function deleteComment(input: DeleteCommentInput) {
  if (!DeleteCommentInput.validate(input)) {
    throw new EventError('INVALID_INPUT', 'Invalid delete comment input');
  }

  const {shareId, commentId} = input;
  return appendValidatedEvents(shareId, [
    {$type: 'comment.deleted', commentId},
  ] satisfies [CommentDeletedPayload]);
}

async function getActor() {
  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }
  return toEventActor(session);
}

async function appendValidatedEvents(
  shareId: string,
  payloads: readonly ShareEventPayload[],
) {
  const {actorId, actor} = await getActor();

  return appendEvents(shareId, actorId, payloads, (records) => {
    const createdAt = new Date().toISOString();
    check(
      records,
      payloads.map((payload) => ({actorId, actor, createdAt, payload})),
    );
  });
}
