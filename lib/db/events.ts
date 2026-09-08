import 'server-only';

import {and, asc, eq, gt} from 'drizzle-orm';

import {db} from '@/lib/db/client';
import {events as eventsTable} from '@/lib/db/schema';

export function getEvents(shareId: string, afterSeq = 0) {
  const where = and(
    eq(eventsTable.shareId, shareId),
    gt(eventsTable.seq, afterSeq).if(afterSeq > 0),
  );

  return db
    .select()
    .from(eventsTable)
    .where(where)
    .orderBy(asc(eventsTable.seq));
}
