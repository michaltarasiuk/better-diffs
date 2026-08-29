import 'server-only';

import {asc, eq, lt, sql} from 'drizzle-orm';

import {isDefined} from '@/lib/utils/defined';

import {db} from '.';
import {
  files as filesTable,
  patches as patchesTable,
  shares as sharesTable,
} from './schema';

import type {FileDiffMetadata} from '@pierre/diffs';

export function findShare(id: string) {
  return db.query.shares
    .findFirst({
      where: eq(sharesTable.id, id),
      with: {
        patches: {
          orderBy: asc(patchesTable.order),
          with: {
            files: {
              orderBy: asc(filesTable.order),
            },
          },
        },
      },
    })
    .sync();
}

export function touchShare(id: string) {
  return db
    .update(sharesTable)
    .set({lastVisitedAt: sql`datetime('now')`})
    .where(eq(sharesTable.id, id))
    .run();
}

export function createShare(patches: readonly (readonly FileDiffMetadata[])[]) {
  return db.transaction((tx) => {
    const [inserted] = tx
      .insert(sharesTable)
      .values({})
      .returning({
        id: sharesTable.id,
      })
      .all();

    if (!isDefined(inserted)) {
      throw new Error('Failed to create share');
    }

    const insertedPatches = tx
      .insert(patchesTable)
      .values(
        patches.map((_, i) => ({
          shareId: inserted.id,
          order: i,
        })),
      )
      .returning({
        id: patchesTable.id,
        order: patchesTable.order,
      })
      .all();

    const files = insertedPatches.flatMap((p) =>
      (patches[p.order] ?? []).map((metadata, i) => ({
        patchId: p.id,
        name: metadata.name,
        metadata,
        order: i,
      })),
    );

    if (files.length > 0) {
      tx.insert(filesTable).values(files).run();
    }

    return inserted.id;
  });
}

interface DeleteExpiredSharesOptions {
  readonly maxAgeHours: number;
}

export function deleteExpiredShares({maxAgeHours}: DeleteExpiredSharesOptions) {
  return db
    .delete(sharesTable)
    .where(
      lt(
        sharesTable.lastVisitedAt,
        sql`datetime('now', ${`-${maxAgeHours} hours`})`,
      ),
    )
    .run();
}
