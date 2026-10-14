import type {SerializedEditorState} from 'lexical';
import {z} from 'zod';

import {AnnotationSide} from '@/diffs/schemas';
import {isDefined} from '@/utils/is-defined';

export const Anchor = z.object({
  shareId: z.uuid(),
  filePath: z.string(),
  side: AnnotationSide,
  line: z.int().positive(),
});
export type Anchor = z.infer<typeof Anchor>;

const LexicalBody = z.custom<SerializedEditorState>(isDefined);

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
  resolved: z.boolean(),
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

export interface ShareRows {
  readonly threads: readonly Thread[];
  readonly comments: readonly Comment[];
}

export type Change =
  | {
      readonly $type: 'thread.opened';
      readonly threadId: string;
      readonly anchor: Anchor;
    }
  | {readonly $type: 'thread.resolved'; readonly threadId: string}
  | {
      readonly $type: 'comment.created';
      readonly threadId: string;
      readonly commentId: string;
      readonly body: SerializedEditorState;
    }
  | {
      readonly $type: 'comment.edited';
      readonly commentId: string;
      readonly body: SerializedEditorState;
    }
  | {readonly $type: 'comment.deleted'; readonly commentId: string};

export const OpenThreadInput = z
  .object({
    shareId: z.uuid(),
    threadId: z.uuid(),
    commentId: z.uuid(),
    body: LexicalBody,
    anchor: Anchor,
  })
  .refine((input) => input.anchor.shareId === input.shareId, {
    message: 'Anchor belongs to another share',
    path: ['anchor', 'shareId'],
  });
export type OpenThreadInput = z.infer<typeof OpenThreadInput>;

export const ResolveThreadInput = z.object({
  shareId: z.uuid(),
  threadId: z.uuid(),
});
export type ResolveThreadInput = z.infer<typeof ResolveThreadInput>;

export const CreateCommentInput = z.object({
  shareId: z.uuid(),
  threadId: z.uuid(),
  commentId: z.uuid(),
  body: LexicalBody,
});
export type CreateCommentInput = z.infer<typeof CreateCommentInput>;

export const EditCommentInput = z.object({
  shareId: z.uuid(),
  commentId: z.uuid(),
  body: LexicalBody,
});
export type EditCommentInput = z.infer<typeof EditCommentInput>;

export const DeleteCommentInput = z.object({
  shareId: z.uuid(),
  commentId: z.uuid(),
});
export type DeleteCommentInput = z.infer<typeof DeleteCommentInput>;
