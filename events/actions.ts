'use server';

import {unauthorized} from 'next/navigation';

import {isDefined} from '@/utils/is-defined';
import {getSession} from '@/auth/server';
import {appendEvents} from '@/db/events';
import {
  CreateCommentInput,
  DeleteCommentInput,
  EditCommentInput,
  OpenThreadInput,
  ResolveThreadInput,
} from './schemas';

export async function openThread(input: OpenThreadInput) {
  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }

  if (!OpenThreadInput.validate(input)) {
    throw new TypeError('Invalid open thread input');
  }

  const {shareId, threadId, commentId, body, anchor} = input;

  if (anchor.shareId !== shareId) {
    throw new TypeError(`Invalid anchor share id: ${anchor.shareId}`);
  }

  return appendEvents(shareId, session.user.id, [
    {
      $type: 'thread.opened',
      threadId,
      anchor,
    },
    {
      $type: 'comment.created',
      threadId,
      commentId,
      body,
    },
  ]);
}

export async function resolveThread(input: ResolveThreadInput) {
  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }

  if (!ResolveThreadInput.validate(input)) {
    throw new TypeError('Invalid resolve thread input');
  }

  const {shareId, threadId} = input;

  return appendEvents(shareId, session.user.id, [
    {
      $type: 'thread.resolved',
      threadId,
    },
  ]);
}

export async function createComment(input: CreateCommentInput) {
  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }

  if (!CreateCommentInput.validate(input)) {
    throw new TypeError('Invalid create comment input');
  }

  const {shareId, threadId, commentId, body} = input;

  return appendEvents(shareId, session.user.id, [
    {
      $type: 'comment.created',
      threadId,
      commentId,
      body,
    },
  ]);
}

export async function editComment(input: EditCommentInput) {
  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }

  if (!EditCommentInput.validate(input)) {
    throw new TypeError('Invalid edit comment input');
  }

  const {shareId, commentId, body} = input;

  return appendEvents(shareId, session.user.id, [
    {
      $type: 'comment.edited',
      commentId,
      body,
    },
  ]);
}

export async function deleteComment(input: DeleteCommentInput) {
  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }

  if (!DeleteCommentInput.validate(input)) {
    throw new TypeError('Invalid delete comment input');
  }

  const {shareId, commentId} = input;

  return appendEvents(shareId, session.user.id, [
    {
      $type: 'comment.deleted',
      commentId,
    },
  ]);
}
