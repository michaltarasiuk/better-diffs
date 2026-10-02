import type {SerializedEditorState} from 'lexical';
import {z} from 'zod';

import {isDefined} from '@/utils/is-defined';
import {AnnotationSide} from '@/diffs/schemas';

export const Anchor = z.object({
  shareId: z.uuid(),
  filePath: z.string(),
  side: AnnotationSide,
  line: z.int().positive(),
});
export type Anchor = z.infer<typeof Anchor>;

export const LexicalBody = z.custom<SerializedEditorState>(isDefined);
export type LexicalBody = z.infer<typeof LexicalBody>;

const ThreadOpenedPayload = z.object({
  $type: z.literal('thread.opened'),
  threadId: z.uuid(),
  anchor: Anchor,
});
export type ThreadOpenedPayload = z.infer<typeof ThreadOpenedPayload>;

const ThreadResolvedPayload = z.object({
  $type: z.literal('thread.resolved'),
  threadId: z.uuid(),
});
export type ThreadResolvedPayload = z.infer<typeof ThreadResolvedPayload>;

const CommentCreatedPayload = z.object({
  $type: z.literal('comment.created'),
  threadId: z.uuid(),
  commentId: z.uuid(),
  body: LexicalBody,
});
export type CommentCreatedPayload = z.infer<typeof CommentCreatedPayload>;

const CommentEditedPayload = z.object({
  $type: z.literal('comment.edited'),
  commentId: z.uuid(),
  body: LexicalBody,
});
export type CommentEditedPayload = z.infer<typeof CommentEditedPayload>;

const CommentDeletedPayload = z.object({
  $type: z.literal('comment.deleted'),
  commentId: z.uuid(),
});
export type CommentDeletedPayload = z.infer<typeof CommentDeletedPayload>;

export const ShareEventPayload = z.discriminatedUnion('$type', [
  ThreadOpenedPayload,
  ThreadResolvedPayload,
  CommentCreatedPayload,
  CommentEditedPayload,
  CommentDeletedPayload,
]);
export type ShareEventPayload = z.infer<typeof ShareEventPayload>;

export function subjectIdFromPayload(payload: ShareEventPayload) {
  switch (payload.$type) {
    case 'thread.opened':
    case 'thread.resolved':
      return payload.threadId;
    case 'comment.created':
    case 'comment.edited':
    case 'comment.deleted':
      return payload.commentId;
  }
}

export const EVENT_TYPES = [
  'thread.opened',
  'thread.resolved',
  'comment.created',
  'comment.edited',
  'comment.deleted',
] as const satisfies ShareEventPayload['$type'][];

export const OpenThreadInput = z.object({
  shareId: z.uuid(),
  threadId: z.uuid(),
  commentId: z.uuid(),
  body: LexicalBody,
  anchor: Anchor,
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

export const Actor = z.object({
  name: z.string().min(1),
  image: z.string().nullable(),
});
export type Actor = z.infer<typeof Actor>;

export const ShareEvent = z.object({
  id: z.uuid(),
  shareId: z.uuid(),
  seq: z.int().positive(),
  type: z.enum(EVENT_TYPES),
  subjectId: z.uuid(),
  actorId: z.string().min(1),
  actor: Actor,
  payload: ShareEventPayload,
  createdAt: z.iso.datetime(),
});
export type ShareEvent = z.infer<typeof ShareEvent>;
