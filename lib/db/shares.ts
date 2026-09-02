import 'server-only';

import {asc, eq, lt, sql} from 'drizzle-orm';

import {isDefined} from '@/lib/utils/defined';

import {db} from './client';
import {newId} from './id';
import {
  files as filesTable,
  patches as patchesTable,
  shares as sharesTable,
} from './schema';

import type {FileDiffMetadata} from '@pierre/diffs';

export function visitShare(id: string) {
  return db.transaction((tx) => {
    const share = tx
      .update(sharesTable)
      .set({lastVisitedAt: sql`datetime('now')`})
      .where(eq(sharesTable.id, id))
      .returning({id: sharesTable.id})
      .get();

    if (!isDefined(share)) {
      return null;
    }

    return tx
      .select({
        id: filesTable.id,
        name: filesTable.name,
        metadata: filesTable.metadata,
      })
      .from(filesTable)
      .innerJoin(patchesTable, eq(filesTable.patchId, patchesTable.id))
      .where(eq(patchesTable.shareId, id))
      .orderBy(asc(patchesTable.order), asc(filesTable.order))
      .all();
  });
}

export function createShare(patches: readonly (readonly FileDiffMetadata[])[]) {
  const shareId = newId();
  const patchValues: (typeof patchesTable.$inferInsert)[] = [];
  const fileValues: (typeof filesTable.$inferInsert)[] = [];

  for (const [order, patchFiles] of patches.entries()) {
    const patchId = newId();
    patchValues.push({
      id: patchId,
      shareId,
      order,
    });

    for (const [fileOrder, metadata] of patchFiles.entries()) {
      fileValues.push({
        patchId,
        name: metadata.name,
        metadata,
        order: fileOrder,
      });
    }
  }

  db.transaction((tx) => {
    tx.insert(sharesTable).values({id: shareId}).run();

    if (patchValues.length > 0) {
      tx.insert(patchesTable).values(patchValues).run();
    }

    if (fileValues.length > 0) {
      tx.insert(filesTable).values(fileValues).run();
    }
  });

  return shareId;
}

interface DeleteExpiredSharesOptions {
  readonly maxAgeHours: number;
}

export function deleteExpiredShares({maxAgeHours}: DeleteExpiredSharesOptions) {
  const {changes} = db
    .delete(sharesTable)
    .where(
      lt(
        sharesTable.lastVisitedAt,
        sql`datetime('now', ${`-${maxAgeHours} hours`})`,
      ),
    )
    .run();

  return changes;
}
