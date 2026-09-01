import {relations, sql, type InferSelectModel} from 'drizzle-orm';
import {index, integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

import {newId} from '../id';
import {user} from './auth';

import type {FileDiffMetadata} from '@pierre/diffs';
import type {SerializedEditorState} from 'lexical';

export * from './auth';

export const shares = sqliteTable(
  'shares',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    lastVisitedAt: text('last_visited_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index('shares_lastVisitedAt_idx').on(t.lastVisitedAt)],
);

export const sharesRelations = relations(shares, ({many}) => ({
  patches: many(patches),
}));

export const patches = sqliteTable(
  'patches',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    shareId: text('share_id')
      .notNull()
      .references(() => shares.id, {onDelete: 'cascade'}),
    order: integer('order').notNull(),
  },
  (t) => [index('patches_shareId_idx').on(t.shareId)],
);

export const patchesRelations = relations(patches, ({one, many}) => ({
  share: one(shares, {fields: [patches.shareId], references: [shares.id]}),
  files: many(files),
}));

export const files = sqliteTable(
  'files',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    patchId: text('patch_id')
      .notNull()
      .references(() => patches.id, {onDelete: 'cascade'}),
    name: text('name').notNull(),
    metadata: text('metadata', {mode: 'json'})
      .$type<FileDiffMetadata>()
      .notNull(),
    order: integer('order').notNull(),
  },
  (t) => [index('files_patchId_idx').on(t.patchId)],
);

export const filesRelations = relations(files, ({one, many}) => ({
  patch: one(patches, {fields: [files.patchId], references: [patches.id]}),
  threads: many(threads),
}));

export const threads = sqliteTable(
  'threads',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    fileId: text('file_id')
      .notNull()
      .references(() => files.id, {onDelete: 'cascade'}),
    side: text('side', {enum: ['deletions', 'additions']}).notNull(),
    lineNumber: integer('line_number').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index('threads_fileId_idx').on(t.fileId)],
);

export const threadsRelations = relations(threads, ({many, one}) => ({
  file: one(files, {fields: [threads.fileId], references: [files.id]}),
  comments: many(comments),
}));

export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    threadId: text('thread_id')
      .notNull()
      .references(() => threads.id, {onDelete: 'cascade'}),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, {onDelete: 'cascade'}),
    body: text('body', {mode: 'json'}).$type<SerializedEditorState>().notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at'),
  },
  (t) => [index('comments_threadId_idx').on(t.threadId)],
);

export const commentsRelations = relations(comments, ({one}) => ({
  thread: one(threads, {fields: [comments.threadId], references: [threads.id]}),
  author: one(user, {fields: [comments.authorId], references: [user.id]}),
}));

export type Share = InferSelectModel<typeof shares>;
export type Patch = InferSelectModel<typeof patches>;
export type File = InferSelectModel<typeof files>;
export type Thread = InferSelectModel<typeof threads>;
export type Comment = InferSelectModel<typeof comments>;
