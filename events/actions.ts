'use server';

import {unauthorized} from 'next/navigation';

import {getSession} from '@/auth/server';
import {appendEvents} from '@/db/events';
import {isDefined} from '@/utils/is-defined';

import {
  CreateCommentInput,
  DeleteCommentInput,
  EditCommentInput,
  OpenThreadInput,
  ResolveThreadInput,
} from './schemas';

async function getActorId() {
  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }
  return session.user.id;
}

export async function openThread(input: OpenThreadInput) {
  const actorId = await getActorId();

  if (!OpenThreadInput.validate(input)) {
    throw new TypeError('Invalid open thread input');
  }

  const {shareId, threadId, commentId, body, anchor} = input;

  if (anchor.shareId !== shareId) {
    throw new TypeError(`Invalid anchor share id: ${anchor.shareId}`);
  }

  return appendEvents(shareId, actorId, [
    {$type: 'thread.opened', threadId, anchor},
    {$type: 'comment.created', threadId, commentId, body},
  ]);
}

export async function resolveThread(input: ResolveThreadInput) {
  const actorId = await getActorId();

  if (!ResolveThreadInput.validate(input)) {
    throw new TypeError('Invalid resolve thread input');
  }

  const {shareId, threadId} = input;

  return appendEvents(shareId, actorId, [{$type: 'thread.resolved', threadId}]);
}

export async function createComment(input: CreateCommentInput) {
  const actorId = await getActorId();

  if (!CreateCommentInput.validate(input)) {
    throw new TypeError('Invalid create comment input');
  }

  const {shareId, threadId, commentId, body} = input;

  return appendEvents(shareId, actorId, [
    {$type: 'comment.created', threadId, commentId, body},
  ]);
}

export async function editComment(input: EditCommentInput) {
  const actorId = await getActorId();

  if (!EditCommentInput.validate(input)) {
    throw new TypeError('Invalid edit comment input');
  }

  const {shareId, commentId, body} = input;

  return appendEvents(shareId, actorId, [
    {$type: 'comment.edited', commentId, body},
  ]);
}

export async function deleteComment(input: DeleteCommentInput) {
  const actorId = await getActorId();

  if (!DeleteCommentInput.validate(input)) {
    throw new TypeError('Invalid delete comment input');
  }

  const {shareId, commentId} = input;

  return appendEvents(shareId, actorId, [
    {$type: 'comment.deleted', commentId},
  ]);
}
