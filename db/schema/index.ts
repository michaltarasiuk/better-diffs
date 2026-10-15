import type {FileDiffMetadata} from '@pierre/diffs';
import {relations, sql} from 'drizzle-orm';
import {index, integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';
import type {SerializedEditorState} from 'lexical';

import type {Anchor} from '#/threads/schemas';
import {newId} from '#/utils/new-id';

import {user} from './auth';

export * from './auth';

export const shares = sqliteTable(
  'shares',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    patch: text('patch').notNull(),
    uploaderKey: text('uploader_key'),
    revision: integer('revision').notNull().default(0),
    pinned: integer('pinned', {mode: 'boolean'}).notNull().default(false),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    lastVisitedAt: text('last_visited_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index('shares_lastVisitedAt_idx').on(t.lastVisitedAt),
    index('shares_uploaderKey_createdAt_idx').on(t.uploaderKey, t.createdAt),
  ],
);

export const sharesRelations = relations(shares, ({many}) => ({
  patches: many(patches),
  threads: many(threads),
  comments: many(comments),
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

export const filesRelations = relations(files, ({one}) => ({
  patch: one(patches, {fields: [files.patchId], references: [patches.id]}),
}));

export const threads = sqliteTable(
  'threads',
  {
    id: text('id').primaryKey(),
    shareId: text('share_id')
      .notNull()
      .references(() => shares.id, {onDelete: 'cascade'}),
    filePath: text('file_path').notNull(),
    side: text('side').$type<Anchor['side']>().notNull(),
    line: integer('line').notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, {onDelete: 'restrict'}),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('threads_shareId_idx').on(t.shareId)],
);

export const threadsRelations = relations(threads, ({one, many}) => ({
  share: one(shares, {fields: [threads.shareId], references: [shares.id]}),
  actor: one(user, {fields: [threads.actorId], references: [user.id]}),
  comments: many(comments),
}));

export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey(),
    shareId: text('share_id')
      .notNull()
      .references(() => shares.id, {onDelete: 'cascade'}),
    threadId: text('thread_id')
      .notNull()
      .references(() => threads.id, {onDelete: 'cascade'}),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, {onDelete: 'restrict'}),
    body: text('body', {mode: 'json'}).$type<SerializedEditorState>().notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('comments_shareId_idx').on(t.shareId),
    index('comments_threadId_idx').on(t.threadId),
  ],
);

export const commentsRelations = relations(comments, ({one}) => ({
  share: one(shares, {fields: [comments.shareId], references: [shares.id]}),
  thread: one(threads, {fields: [comments.threadId], references: [threads.id]}),
  actor: one(user, {fields: [comments.actorId], references: [user.id]}),
}));

export type Share = typeof shares.$inferSelect;
export type NewShare = typeof shares.$inferInsert;

export type Patch = typeof patches.$inferSelect;
export type NewPatch = typeof patches.$inferInsert;

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
