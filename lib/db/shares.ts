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

export async function visitShare(id: string) {
  return db.transaction(async (tx) => {
    const [share] = await tx
      .update(sharesTable)
      .set({lastVisitedAt: sql`datetime('now')`})
      .where(eq(sharesTable.id, id))
      .returning({id: sharesTable.id});

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
      .orderBy(asc(patchesTable.order), asc(filesTable.order));
  });
}

export async function createShare(
  patches: readonly (readonly FileDiffMetadata[])[],
) {
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

  await db.transaction(async (tx) => {
    await tx.insert(sharesTable).values({id: shareId});

    if (patchValues.length > 0) {
      await tx.insert(patchesTable).values(patchValues);
    }

    if (fileValues.length > 0) {
      await tx.insert(filesTable).values(fileValues);
    }
  });

  return shareId;
}

interface DeleteExpiredSharesOptions {
  readonly maxAgeHours: number;
}

export async function deleteExpiredShares({
  maxAgeHours,
}: DeleteExpiredSharesOptions) {
  const deleted = await db
    .delete(sharesTable)
    .where(
      lt(
        sharesTable.lastVisitedAt,
        sql`datetime('now', ${`-${maxAgeHours} hours`})`,
      ),
    )
    .returning({id: sharesTable.id});

  return deleted.length;
}
