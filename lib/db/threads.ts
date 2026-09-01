import 'server-only';

import {db} from '.';
import {newId} from './id';
import {comments, threads} from './schema';

import type {SerializedEditorState} from 'lexical';

interface CreateThreadInput {
  readonly fileId: string;
  readonly side: 'deletions' | 'additions';
  readonly lineNumber: number;
  readonly authorId: string;
  readonly body: SerializedEditorState;
}

export function createThread(input: CreateThreadInput) {
  const threadId = newId();
  const commentId = newId();

  db.transaction((tx) => {
    tx.insert(threads)
      .values({
        id: threadId,
        fileId: input.fileId,
        side: input.side,
        lineNumber: input.lineNumber,
      })
      .run();

    tx.insert(comments)
      .values({
        id: commentId,
        threadId,
        authorId: input.authorId,
        body: input.body,
      })
      .run();
  });

  return {threadId, commentId};
}
