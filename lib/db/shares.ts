import type {FileDiffMetadata} from '@pierre/diffs';

import {asc, eq, lt, sql} from 'drizzle-orm';

import {db} from '.';
import {patches, shares} from './schema';

export function findShareWithPatches(id: string) {
  return db.query.shares
    .findFirst({
      where: eq(shares.id, id),
      with: {
        patches: {
          orderBy: asc(patches.order),
        },
      },
    })
    .sync();
}

export function touchShare(id: string) {
  return db
    .update(shares)
    .set({lastVisitedAt: sql`datetime('now')`})
    .where(eq(shares.id, id))
    .run();
}

export function createShare(
  sharePatches: readonly (readonly FileDiffMetadata[])[],
) {
  return db.transaction((tx) => {
    const [{id}] = tx
      .insert(shares)
      .values({})
      .returning({
        id: shares.id,
      })
      .all();

    tx.insert(patches)
      .values(
        sharePatches.map((files, order) => ({
          shareId: id,
          files: [...files],
          order,
        })),
      )
      .run();

    return id;
  });
}

interface DeleteExpiredSharesOptions {
  readonly maxAgeHours: number;
}

export function deleteExpiredShares({maxAgeHours}: DeleteExpiredSharesOptions) {
  return db
    .delete(shares)
    .where(
      lt(
        shares.lastVisitedAt,
        sql`datetime('now', ${`-${maxAgeHours} hours`})`,
      ),
    )
    .run();
}
