import 'server-only';

import {and, asc, eq, gt} from 'drizzle-orm';

import {db} from '@/data/db';
import {events as eventsTable} from '@/data/schema';

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
