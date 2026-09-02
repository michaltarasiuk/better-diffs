'use server';

import {notFound, unauthorized} from 'next/navigation';
import {z} from 'zod';

import {getSession} from '@/lib/auth/server';
import {shareContainsFile} from '@/lib/db/files';
import {createThread} from '@/lib/db/threads';
import {isDefined} from '@/lib/utils/defined';

import type {SerializedEditorState} from 'lexical';

const AddCommentInput = z.object({
  shareId: z.uuid(),
  fileId: z.uuid(),
  side: z.enum(['deletions', 'additions']),
  lineNumber: z.int().positive(),
  body: z.custom<SerializedEditorState>(isDefined),
});

export async function addComment(input: z.infer<typeof AddCommentInput>) {
  const {shareId, fileId, side, lineNumber, body} =
    AddCommentInput.parse(input);

  const session = await getSession();
  if (!isDefined(session)) {
    unauthorized();
  }

  if (!shareContainsFile(shareId, fileId)) {
    notFound();
  }

  return createThread({
    fileId,
    side,
    lineNumber,
    authorId: session.user.id,
    body,
  });
}
