import type {SerializedEditorState} from 'lexical';
import {z} from 'zod';

import {AnnotationSide} from '#/diffs/schemas';
import {isCommentBody} from '#/lexical/is-comment-body';
import {isDefined} from '#/utils/is-defined';

export const Anchor = z.object({
  fileId: z.uuid(),
  side: AnnotationSide,
  line: z.int().positive(),
});
export type Anchor = z.infer<typeof Anchor>;

const LexicalBody = z.custom<SerializedEditorState>(isDefined);

const CommentBody = z.custom<SerializedEditorState>(isCommentBody);

export const Actor = z.object({
  name: z.string().min(1),
  image: z.string().nullable(),
});
export type Actor = z.infer<typeof Actor>;

export const Thread = z.object({
  id: z.uuid(),
  anchor: Anchor,
  actorId: z.string().min(1),
  actor: Actor,
  createdAt: z.iso.datetime(),
});
export type Thread = z.infer<typeof Thread>;

export const Comment = z.object({
  id: z.uuid(),
  threadId: z.uuid(),
  actorId: z.string().min(1),
  actor: Actor,
  body: LexicalBody,
  createdAt: z.iso.datetime(),
});
export type Comment = z.infer<typeof Comment>;

export const ShareSnapshot = z.object({
  revision: z.int().nonnegative(),
  threads: z.array(Thread),
  comments: z.array(Comment),
});
export type ShareSnapshot = z.infer<typeof ShareSnapshot>;

export type Change =
  | {
      readonly type: 'openThread';
      readonly threadId: string;
      readonly anchor: Anchor;
    }
  | {
      readonly type: 'createComment';
      readonly threadId: string;
      readonly commentId: string;
      readonly body: SerializedEditorState;
    };

export const OpenThreadInput = z.object({
  shareId: z.uuid(),
  threadId: z.uuid(),
  commentId: z.uuid(),
  body: CommentBody,
  anchor: Anchor,
});
export type OpenThreadInput = z.infer<typeof OpenThreadInput>;

export const CreateCommentInput = z.object({
  shareId: z.uuid(),
  threadId: z.uuid(),
  commentId: z.uuid(),
  body: CommentBody,
});
export type CreateCommentInput = z.infer<typeof CreateCommentInput>;
