import 'server-only';

import {and, asc, eq, gt, sql} from 'drizzle-orm';

import {type ShareEventPayload, subjectIdFromPayload} from '@/events/schemas';
import {isDefined} from '@/utils/is-defined';

import {db} from './db';
import {
  events as eventsTable,
  shares as sharesTable,
  user as userTable,
} from './schema';

export function getEvents(shareId: string, afterSeq = 0) {
  const where = and(
    eq(eventsTable.shareId, shareId),
    gt(eventsTable.seq, afterSeq).if(afterSeq > 0),
  );

  return db
    .select({
      id: eventsTable.id,
      shareId: eventsTable.shareId,
      seq: eventsTable.seq,
      type: eventsTable.type,
      subjectId: eventsTable.subjectId,
      actorId: eventsTable.actorId,
      actor: {
        name: userTable.name,
        image: userTable.image,
      },
      payload: eventsTable.payload,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .innerJoin(userTable, eq(eventsTable.actorId, userTable.id))
    .where(where)
    .orderBy(asc(eventsTable.seq));
}

export async function appendEvents(
  shareId: string,
  actorId: string,
  payloads: readonly ShareEventPayload[],
) {
  if (payloads.length === 0) {
    return [];
  }

  return db.transaction(async (tx) => {
    const [share] = await tx
      .update(sharesTable)
      .set({
        lastEventSeq: sql`${sharesTable.lastEventSeq} + ${payloads.length}`,
      })
      .where(eq(sharesTable.id, shareId))
      .returning({lastEventSeq: sharesTable.lastEventSeq});

    if (!isDefined(share)) {
      throw new Error(`Share not found: ${shareId}`);
    }

    const firstSeq = share.lastEventSeq - payloads.length;
    const createdAt = new Date().toISOString();

    return tx
      .insert(eventsTable)
      .values(
        payloads.map((payload, index) => ({
          shareId,
          seq: firstSeq + (index + 1),
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
