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
  type Actor,
} from './schemas';

export async function openThread(input: OpenThreadInput) {
  if (!OpenThreadInput.validate(input)) {
    throw new TypeError('Invalid open thread input');
  }

  const {actorId} = await getActor();
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
  if (!ResolveThreadInput.validate(input)) {
    throw new TypeError('Invalid resolve thread input');
  }

  const {actorId} = await getActor();
  const {shareId, threadId} = input;

  return appendEvents(shareId, actorId, [{$type: 'thread.resolved', threadId}]);
}

export async function createComment(input: CreateCommentInput) {
  if (!CreateCommentInput.validate(input)) {
    throw new TypeError('Invalid create comment input');
  }

  const {actorId} = await getActor();
  const {shareId, threadId, commentId, body} = input;

  return appendEvents(shareId, actorId, [
    {$type: 'comment.created', threadId, commentId, body},
  ]);
}

export async function editComment(input: EditCommentInput) {
  if (!EditCommentInput.validate(input)) {
    throw new TypeError('Invalid edit comment input');
  }

  const {actorId} = await getActor();
  const {shareId, commentId, body} = input;

  return appendEvents(shareId, actorId, [
    {$type: 'comment.edited', commentId, body},
  ]);
}

export async function deleteComment(input: DeleteCommentInput) {
  if (!DeleteCommentInput.validate(input)) {
    throw new TypeError('Invalid delete comment input');
  }

  const {actorId} = await getActor();
  const {shareId, commentId} = input;

  return appendEvents(shareId, actorId, [
    {$type: 'comment.deleted', commentId},
  ]);
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
