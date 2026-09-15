'use server';

import {unauthorized} from 'next/navigation';
import {z} from 'zod';

import {assert} from '@/utils/assert';
import {isDefined} from '@/utils/defined';
import {getSession} from '@/auth/server';
import {appendEvents} from '@/db/events';
import {Anchor, LexicalBody} from '@/events/schemas';

const OpenThreadInput = z.object({
  shareId: z.uuid(),
  threadId: z.uuid(),
  commentId: z.uuid(),
  body: LexicalBody,
  anchor: Anchor,
});
type OpenThreadInput = z.infer<typeof OpenThreadInput>;

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
