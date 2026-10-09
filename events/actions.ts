'use server';

import {unauthorized} from 'next/navigation';

import {getSession} from '@/auth/server';
import {appendEvents, getEvents} from '@/db/events';
import {isDefined} from '@/utils/is-defined';

import {
  type Actor,
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
import {Draft, ShareState} from './state';

export async function openThread(input: OpenThreadInput) {
  if (!OpenThreadInput.validate(input)) {
    throw new Error('Invalid open thread input');
  }

  if (input.anchor.shareId !== input.shareId) {
    throw new Error(`Invalid share id: ${input.anchor.shareId}`);
  }

  const {shareId, threadId, commentId, body, anchor} = input;
  return appendValidatedEvents(shareId, [
    {$type: 'thread.opened', threadId, anchor},
    {$type: 'comment.created', threadId, commentId, body},
  ] satisfies [ThreadOpenedPayload, CommentCreatedPayload]);
}

export async function resolveThread(input: ResolveThreadInput) {
  if (!ResolveThreadInput.validate(input)) {
    throw new Error('Invalid resolve thread input');
  }

  const {shareId, threadId} = input;
  return appendValidatedEvents(shareId, [
    {$type: 'thread.resolved', threadId},
  ] satisfies [ThreadResolvedPayload]);
}

export async function createComment(input: CreateCommentInput) {
  if (!CreateCommentInput.validate(input)) {
    throw new Error('Invalid create comment input');
  }

  const {shareId, threadId, commentId, body} = input;
  return appendValidatedEvents(shareId, [
    {$type: 'comment.created', threadId, commentId, body},
  ] satisfies [CommentCreatedPayload]);
}

export async function editComment(input: EditCommentInput) {
  if (!EditCommentInput.validate(input)) {
    throw new Error('Invalid edit comment input');
  }

  const {shareId, commentId, body} = input;
  return appendValidatedEvents(shareId, [
    {$type: 'comment.edited', commentId, body},
  ] satisfies [CommentEditedPayload]);
}

export async function deleteComment(input: DeleteCommentInput) {
  if (!DeleteCommentInput.validate(input)) {
    throw new Error('Invalid delete comment input');
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
  const {user} = session;
  return {
    actorId: user.id,
    actor: {
      name: user.name,
      image: user.image ?? null,
    } satisfies Actor,
  };
}

async function appendValidatedEvents(
  shareId: string,
  payloads: readonly ShareEventPayload[],
) {
  const {actorId, actor} = await getActor();

  const state = new ShareState();
  state.ingest(await getEvents(shareId));

  const fork = Draft.fork(state);
  const createdAt = new Date().toISOString();

  for (const payload of payloads) {
    fork.apply({
      actorId,
      actor,
      createdAt,
      payload,
    });
  }

  return appendEvents(shareId, actorId, payloads);
}
