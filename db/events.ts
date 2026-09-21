import 'server-only';

import {and, asc, eq, gt, max} from 'drizzle-orm';

import {isDefined} from '@/utils/is-defined';
import {type ShareEventPayload, subjectIdFromPayload} from '@/events/schemas';
import {db} from './db';
import {events as eventsTable, shares as sharesTable} from './schema';

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

export async function appendEvents(
  shareId: string,
  actorId: string,
  payloads: readonly ShareEventPayload[],
) {
  return db.transaction(async (tx) => {
    const [share] = await tx
      .select({lastSeq: max(eventsTable.seq)})
      .from(sharesTable)
      .leftJoin(eventsTable, eq(eventsTable.shareId, sharesTable.id))
      .where(eq(sharesTable.id, shareId))
      .groupBy(sharesTable.id);

    if (!isDefined(share)) {
      throw new Error(`Share not found: ${shareId}`);
    }

    const lastSeq = share.lastSeq ?? 0;
    const createdAt = new Date().toISOString();

    return tx
      .insert(eventsTable)
      .values(
        payloads.map((payload, index) => ({
          shareId,
          seq: lastSeq + index + 1,
          type: payload.$type,
          subjectId: subjectIdFromPayload(payload),
          actorId,
          payload,
          createdAt,
        })),
      )
      .returning();
  });
}
