import 'server-only';

import {and, eq} from 'drizzle-orm';

import {isDefined} from '@/lib/utils/defined';

import {db} from './client';
import {files as filesTable, patches as patchesTable} from './schema';

export function shareContainsFile(shareId: string, fileId: string) {
  const file = db
    .select({id: filesTable.id})
    .from(filesTable)
    .innerJoin(patchesTable, eq(filesTable.patchId, patchesTable.id))
    .where(and(eq(filesTable.id, fileId), eq(patchesTable.shareId, shareId)))
    .get();

  return isDefined(file);
}
