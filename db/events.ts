import 'server-only';

import {and, asc, eq, gt, max} from 'drizzle-orm';

import {assert} from '@/utils/assert';
import {isDefined} from '@/utils/defined';
import {db} from '@/db/db';
import {events as eventsTable, shares as sharesTable} from '@/db/schema';
import type {ShareEventPayload} from '@/events/schemas';

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

    assert(isDefined(share), `Share not found: ${shareId}`);

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

function subjectIdFromPayload(payload: ShareEventPayload) {
  switch (payload.$type) {
    case 'thread.opened':
    case 'thread.resolved':
      return payload.threadId;
    case 'comment.created':
    case 'comment.edited':
    case 'comment.deleted':
      return payload.commentId;
  }
}
