import {z} from 'zod';

import {SelectionSide} from '@/lib/diffs/schemas';
import {isDefined} from '@/lib/utils/defined';

import type {SerializedEditorState} from 'lexical';

const Anchor = z.object({
  shareId: z.uuid(),
  filePath: z.string(),
  side: SelectionSide,
  line: z.int().positive(),
});
export type Anchor = z.infer<typeof Anchor>;

const LexicalBody = z.custom<SerializedEditorState>(isDefined);
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

export const EVENT_TYPES = [
  'thread.opened',
  'thread.resolved',
  'comment.created',
  'comment.edited',
  'comment.deleted',
] as const satisfies ShareEventPayload['$type'][];

export const ShareEvent = z.object({
  id: z.uuid(),
  shareId: z.uuid(),
  seq: z.int().positive(),
  type: z.enum(EVENT_TYPES),
  subjectId: z.uuid(),
  actorId: z.string().min(1),
  payload: ShareEventPayload,
  createdAt: z.iso.datetime(),
});
export type ShareEvent = z.infer<typeof ShareEvent>;
