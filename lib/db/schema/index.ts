import {relations, sql} from 'drizzle-orm';
import {index, integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

import {EVENT_TYPES, type ShareEventPayload} from '@/lib/events/schemas';

import {newId} from '../id';
import {user} from './auth';

import type {FileDiffMetadata} from '@pierre/diffs';

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
  events: many(events),
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

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    shareId: text('share_id')
      .notNull()
      .references(() => shares.id, {onDelete: 'cascade'}),
    seq: integer('seq').notNull(),
    type: text('type', {enum: EVENT_TYPES}).notNull(),
    subjectId: text('subject_id').notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, {onDelete: 'cascade'}),
    payload: text('payload', {mode: 'json'})
      .$type<ShareEventPayload>()
      .notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    index('events_shareId_seq_idx').on(t.shareId, t.seq),
    index('events_shareId_idx').on(t.shareId),
  ],
);

export const eventsRelations = relations(events, ({one}) => ({
  share: one(shares, {fields: [events.shareId], references: [shares.id]}),
  actor: one(user, {fields: [events.actorId], references: [user.id]}),
}));

export type Share = typeof shares.$inferSelect;
export type NewShare = typeof shares.$inferInsert;

export type Patch = typeof patches.$inferSelect;
export type NewPatch = typeof patches.$inferInsert;

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
