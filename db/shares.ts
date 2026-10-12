import 'server-only';

import type {FileDiffMetadata} from '@pierre/diffs';
import {asc, eq, lt, sql} from 'drizzle-orm';

import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';

import {db} from './db';
import {
  files as filesTable,
  patches as patchesTable,
  shares as sharesTable,
} from './schema';

export async function touchShare(id: string) {
  const [share] = await db
    .update(sharesTable)
    .set({lastVisitedAt: sql`datetime('now')`})
    .where(eq(sharesTable.id, id))
    .returning({id: sharesTable.id});

  return isDefined(share);
}

export async function getShareFiles(id: string) {
  return db
    .select({
      id: filesTable.id,
      name: filesTable.name,
      metadata: filesTable.metadata,
    })
    .from(filesTable)
    .innerJoin(patchesTable, eq(filesTable.patchId, patchesTable.id))
    .where(eq(patchesTable.shareId, id))
    .orderBy(asc(patchesTable.order), asc(filesTable.order));
}

export async function createShare(
  patches: readonly (readonly FileDiffMetadata[])[],
) {
  const shareId = newId();
  const patchValues: (typeof patchesTable.$inferInsert)[] = [];
  const fileValues: (typeof filesTable.$inferInsert)[] = [];

  for (const [patchOrder, patchFiles] of patches.entries()) {
    const patchId = newId();
    patchValues.push({
      id: patchId,
      shareId,
      order: patchOrder,
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

export async function deleteExpiredShares({
  maxAgeHours,
}: {
  readonly maxAgeHours: number;
}) {
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
