import {type InferSelectModel, relations, sql} from 'drizzle-orm';
import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';
import type {FileDiffMetadata} from '@pierre/diffs';

export const shares = sqliteTable('shares', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  lastVisitedAt: text('last_visited_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sharesRelations = relations(shares, ({many}) => ({
  patches: many(patches),
}));

export const patches = sqliteTable('patches', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  shareId: text('share_id')
    .notNull()
    .references(() => shares.id, {onDelete: 'cascade'}),
  files: text('files', {mode: 'json'}).$type<FileDiffMetadata[]>().notNull(),
  order: integer('order').notNull(),
});

export const patchesRelations = relations(patches, ({one}) => ({
  share: one(shares, {fields: [patches.shareId], references: [shares.id]}),
}));

export type Share = InferSelectModel<typeof shares>;
export type Patch = InferSelectModel<typeof patches>;
