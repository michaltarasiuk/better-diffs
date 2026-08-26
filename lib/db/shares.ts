import 'server-only';

import {asc, eq, lt, sql} from 'drizzle-orm';

import {isDefined} from '@/lib/utils/defined';

import {db} from '.';
import {patches, shares} from './schema';

import type {FileDiffMetadata} from '@pierre/diffs';

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
    const [inserted] = tx
      .insert(shares)
      .values({})
      .returning({
        id: shares.id,
      })
      .all();

    if (!isDefined(inserted)) {
      throw new Error('Failed to create share');
    }

    tx.insert(patches)
      .values(
        sharePatches.map((f, i) => ({
          shareId: inserted.id,
          files: [...f],
          order: i,
        })),
      )
      .run();

    return inserted.id;
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
