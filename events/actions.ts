'use server';

import {unauthorized} from 'next/navigation';

import {isDefined} from '@/utils/defined';
import {getSession} from '@/auth/server';
import {appendEvents} from '@/db/events';
import {OpenThreadInput} from '@/events/schemas';

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
    throw new TypeError(
      `Anchor shareId ${anchor.shareId} does not match ${shareId}`,
    );
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
