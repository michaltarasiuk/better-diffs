'use server';

import {unauthorized} from 'next/navigation';

import {getSession} from '#/auth/server';
import {saveChanges} from '#/db/threads';
import {isDefined} from '#/utils/is-defined';

import {threadError} from './errors';
import {CreateCommentInput, OpenThreadInput, type Change} from './schemas';

export async function openThread(input: OpenThreadInput) {
  if (!OpenThreadInput.validate(input)) {
    return threadError('INVALID_INPUT', 'Invalid open thread input');
  }

  const {shareId, threadId, commentId, body, anchor} = input;
  return save(shareId, [
    {type: 'openThread', threadId, anchor},
    {type: 'createComment', threadId, commentId, body},
  ]);
}

export async function createComment(input: CreateCommentInput) {
  if (!CreateCommentInput.validate(input)) {
    return threadError('INVALID_INPUT', 'Invalid create comment input');
  }

  const {shareId, threadId, commentId, body} = input;
  return save(shareId, [{type: 'createComment', threadId, commentId, body}]);
}

async function save(shareId: string, changes: readonly Change[]) {
  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }

  return saveChanges(shareId, session.user.id, changes);
}
