import 'server-only';

import type {FileDiffMetadata} from '@pierre/diffs';
import {and, asc, eq, gt, isNotNull, lt, sql} from 'drizzle-orm';

import {isDefined} from '#/utils/is-defined';
import {newId} from '#/utils/new-id';

import {db} from './db';
import {
  files as filesTable,
  patches as patchesTable,
  shares as sharesTable,
} from './schema';

const VISIT_REFRESH_HOURS = 1;

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

export async function getSharePatch(id: string) {
  const [share] = await db
    .select({patch: sharesTable.patch})
    .from(sharesTable)
    .where(eq(sharesTable.id, id));

  return share?.patch;
}

export async function touchShare(id: string) {
  const refreshBefore = sql`datetime('now', ${`-${VISIT_REFRESH_HOURS} hours`})`;
  const [share] = await db
    .select({
      isStale: lt(sharesTable.lastVisitedAt, refreshBefore).mapWith(Boolean),
    })
    .from(sharesTable)
    .where(eq(sharesTable.id, id));

  if (!isDefined(share)) {
    return false;
  }
  if (share.isStale) {
    await db
      .update(sharesTable)
      .set({lastVisitedAt: sql`datetime('now')`})
      .where(eq(sharesTable.id, id));
  }
  return true;
}

export async function createShare(
  patch: string,
  patches: readonly (readonly FileDiffMetadata[])[],
  uploaderKey?: string,
  checkUploadRate?: (uploadsInLastHour: number) => void,
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
    if (isDefined(uploaderKey) && isDefined(checkUploadRate)) {
      checkUploadRate(
        await tx.$count(
          sharesTable,
          and(
            eq(sharesTable.uploaderKey, uploaderKey),
            gt(sharesTable.createdAt, sql`datetime('now', '-1 hours')`),
          ),
        ),
      );
    }

    await tx.insert(sharesTable).values({id: shareId, patch, uploaderKey});

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
      and(
        eq(sharesTable.pinned, false),
        lt(
          sharesTable.lastVisitedAt,
          sql`datetime('now', ${`-${maxAgeHours} hours`})`,
        ),
      ),
    )
    .returning({id: sharesTable.id});

  return deleted.length;
}

export async function forgetUploaders({
  olderThanHours,
}: {
  readonly olderThanHours: number;
}) {
  await db
    .update(sharesTable)
    .set({uploaderKey: null})
    .where(
      and(
        isNotNull(sharesTable.uploaderKey),
        lt(
          sharesTable.createdAt,
          sql`datetime('now', ${`-${olderThanHours} hours`})`,
        ),
      ),
    );
}
