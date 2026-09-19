'use server';

import {unauthorized} from 'next/navigation';

import {assert} from '@/utils/assert';
import {isDefined} from '@/utils/defined';
import {getSession} from '@/auth/server';
import {appendEvents} from '@/db/events';
import {OpenThreadInput} from '@/events/schemas';

export async function openThread(input: OpenThreadInput) {
  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }

  assert(OpenThreadInput.validate(input), 'Invalid open thread input');

  const {shareId, threadId, commentId, body, anchor} = input;

  assert(
    anchor.shareId === shareId,
    `Anchor shareId ${anchor.shareId} does not match ${shareId}`,
  );

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
