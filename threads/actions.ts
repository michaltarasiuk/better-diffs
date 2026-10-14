'use server';

import {unauthorized} from 'next/navigation';

import {getSession} from '@/auth/server';
import {saveChanges} from '@/db/threads';
import {isDefined} from '@/utils/is-defined';

import {ThreadError} from './errors';
import {
  type Change,
  CreateCommentInput,
  DeleteCommentInput,
  EditCommentInput,
  OpenThreadInput,
  ResolveThreadInput,
} from './schemas';
import {check} from './state';

export async function openThread(input: OpenThreadInput) {
  if (!OpenThreadInput.validate(input)) {
    throw new ThreadError('INVALID_INPUT', 'Invalid open thread input');
  }

  const {shareId, threadId, commentId, body, anchor} = input;
  await save(shareId, [
    {$type: 'thread.opened', threadId, anchor},
    {$type: 'comment.created', threadId, commentId, body},
  ]);
}

export async function resolveThread(input: ResolveThreadInput) {
  if (!ResolveThreadInput.validate(input)) {
    throw new ThreadError('INVALID_INPUT', 'Invalid resolve thread input');
  }

  const {shareId, threadId} = input;
  await save(shareId, [{$type: 'thread.resolved', threadId}]);
}

export async function createComment(input: CreateCommentInput) {
  if (!CreateCommentInput.validate(input)) {
    throw new ThreadError('INVALID_INPUT', 'Invalid create comment input');
  }

  const {shareId, threadId, commentId, body} = input;
  await save(shareId, [{$type: 'comment.created', threadId, commentId, body}]);
}

export async function editComment(input: EditCommentInput) {
  if (!EditCommentInput.validate(input)) {
    throw new ThreadError('INVALID_INPUT', 'Invalid edit comment input');
  }

  const {shareId, commentId, body} = input;
  await save(shareId, [{$type: 'comment.edited', commentId, body}]);
}

export async function deleteComment(input: DeleteCommentInput) {
  if (!DeleteCommentInput.validate(input)) {
    throw new ThreadError('INVALID_INPUT', 'Invalid delete comment input');
  }

  const {shareId, commentId} = input;
  await save(shareId, [{$type: 'comment.deleted', commentId}]);
}

async function save(shareId: string, changes: readonly Change[]) {
  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }

  const actorId = session.user.id;
  await saveChanges(shareId, actorId, changes, (rows) => {
    check(rows, actorId, changes);
  });
}
