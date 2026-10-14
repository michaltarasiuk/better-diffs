import 'server-only';

import {and, asc, eq, gt, inArray, type SQL, sql} from 'drizzle-orm';

import {
  type ShareEventPayload,
  type ShareRecords,
  subjectIdFromPayload,
} from '@/events/schemas';
import {isDefined} from '@/utils/is-defined';

import {db} from './db';
import {
  comments as commentsTable,
  events as eventsTable,
  shares as sharesTable,
  threads as threadsTable,
  user as userTable,
} from './schema';

type Executor = Pick<typeof db, 'select'>;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function selectThreads(executor: Executor, where: SQL | undefined) {
  return executor
    .select({
      id: threadsTable.id,
      anchor: {
        shareId: threadsTable.shareId,
        filePath: threadsTable.filePath,
        side: threadsTable.side,
        line: threadsTable.line,
      },
      actorId: threadsTable.actorId,
      actor: {
        name: userTable.name,
        image: userTable.image,
      },
      resolved: threadsTable.resolved,
      createdAt: threadsTable.createdAt,
    })
    .from(threadsTable)
    .innerJoin(userTable, eq(threadsTable.actorId, userTable.id))
    .where(where);
}

function selectComments(executor: Executor, where: SQL | undefined) {
  return executor
    .select({
      id: commentsTable.id,
      threadId: commentsTable.threadId,
      actorId: commentsTable.actorId,
      actor: {
        name: userTable.name,
        image: userTable.image,
      },
      body: commentsTable.body,
      createdAt: commentsTable.createdAt,
    })
    .from(commentsTable)
    .innerJoin(userTable, eq(commentsTable.actorId, userTable.id))
    .where(where)
    .orderBy(asc(commentsTable.seq));
}

export async function getSnapshot(shareId: string) {
  return db.transaction(async (tx) => {
    const [share] = await tx
      .select({seq: sharesTable.lastEventSeq})
      .from(sharesTable)
      .where(eq(sharesTable.id, shareId));

    if (!isDefined(share)) {
      return undefined;
    }

    const threads = await selectThreads(tx, eq(threadsTable.shareId, shareId));
    const comments = await selectComments(
      tx,
      eq(commentsTable.shareId, shareId),
    );

    return {seq: share.seq, threads, comments};
  });
}

export async function getEvents(shareId: string, afterSeq = 0) {
  const events = await db
    .select({
      id: eventsTable.id,
      shareId: eventsTable.shareId,
      seq: eventsTable.seq,
      type: eventsTable.type,
      subjectId: eventsTable.subjectId,
      actorId: eventsTable.actorId,
      createdAt: eventsTable.createdAt,
    })
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.shareId, shareId),
        gt(eventsTable.seq, afterSeq).if(afterSeq > 0),
      ),
    )
    .orderBy(asc(eventsTable.seq));

  const subjectIds = [...new Set(events.map(({subjectId}) => subjectId))];
  const [threads, comments] = await Promise.all([
    selectThreads(
      db,
      and(
        eq(threadsTable.shareId, shareId),
        inArray(threadsTable.id, subjectIds),
      ),
    ),
    selectComments(
      db,
      and(
        eq(commentsTable.shareId, shareId),
        inArray(commentsTable.id, subjectIds),
      ),
    ),
  ]);

  const threadById = new Map(threads.map((thread) => [thread.id, thread]));
  const commentById = new Map(comments.map((comment) => [comment.id, comment]));

  return events.map((event) => {
    switch (event.type) {
      case 'thread.opened':
      case 'thread.resolved':
        return {
          ...event,
          type: event.type,
          thread: threadById.get(event.subjectId) ?? null,
        };
      case 'comment.created':
      case 'comment.edited':
        return {
          ...event,
          type: event.type,
          comment: commentById.get(event.subjectId) ?? null,
        };
      case 'comment.deleted':
        return {...event, type: event.type};
    }
  });
}

async function getRecords(
  tx: Transaction,
  shareId: string,
  payloads: readonly ShareEventPayload[],
) {
  const commentIds = payloads.flatMap((payload) =>
    'commentId' in payload ? [payload.commentId] : [],
  );

  const comments = await selectComments(
    tx,
    and(
      eq(commentsTable.shareId, shareId),
      inArray(commentsTable.id, commentIds),
    ),
  );

  const threadIds = new Set([
    ...payloads.flatMap((payload) =>
      'threadId' in payload ? [payload.threadId] : [],
    ),
    ...comments.map(({threadId}) => threadId),
  ]);
  const threads = await selectThreads(
    tx,
    and(
      eq(threadsTable.shareId, shareId),
      inArray(threadsTable.id, [...threadIds]),
    ),
  );

  const deleted = await tx
    .select({id: eventsTable.subjectId})
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.shareId, shareId),
        eq(eventsTable.type, 'comment.deleted'),
        inArray(eventsTable.subjectId, commentIds),
      ),
    );

  return {
    threads,
    comments,
    deletedCommentIds: deleted.map(({id}) => id),
  };
}

async function applyPayload(
  tx: Transaction,
  {
    shareId,
    actorId,
    seq,
    createdAt,
  }: {
    readonly shareId: string;
    readonly actorId: string;
    readonly seq: number;
    readonly createdAt: string;
  },
  payload: ShareEventPayload,
) {
  switch (payload.$type) {
    case 'thread.opened': {
      const {filePath, side, line} = payload.anchor;
      await tx.insert(threadsTable).values({
        id: payload.threadId,
        shareId,
        filePath,
        side,
        line,
        actorId,
        createdAt,
      });
      break;
    }
    case 'thread.resolved':
      await tx
        .update(threadsTable)
        .set({resolved: true})
        .where(
          and(
            eq(threadsTable.id, payload.threadId),
            eq(threadsTable.shareId, shareId),
          ),
        );
      break;
    case 'comment.created':
      await tx.insert(commentsTable).values({
        id: payload.commentId,
        shareId,
        threadId: payload.threadId,
        seq,
        actorId,
        body: payload.body,
        createdAt,
      });
      break;
    case 'comment.edited':
      await tx
        .update(commentsTable)
        .set({body: payload.body})
        .where(
          and(
            eq(commentsTable.id, payload.commentId),
            eq(commentsTable.shareId, shareId),
          ),
        );
      break;
    case 'comment.deleted':
      await tx
        .delete(commentsTable)
        .where(
          and(
            eq(commentsTable.id, payload.commentId),
            eq(commentsTable.shareId, shareId),
          ),
        );
      break;
    default:
      payload satisfies never;
  }
}

export async function appendEvents(
  shareId: string,
  actorId: string,
  payloads: readonly ShareEventPayload[],
  validate: (records: ShareRecords) => void,
) {
  if (payloads.length === 0) {
    return [];
  }

  return db.transaction(async (tx) => {
    const [share] = await tx
      .update(sharesTable)
      .set({
        lastEventSeq: sql`${sharesTable.lastEventSeq} + ${payloads.length}`,
        lastVisitedAt: sql`datetime('now')`,
      })
      .where(eq(sharesTable.id, shareId))
      .returning({lastEventSeq: sharesTable.lastEventSeq});

    if (!isDefined(share)) {
      throw new Error(`Share not found: ${shareId}`);
    }

    validate(await getRecords(tx, shareId, payloads));

    const firstSeq = share.lastEventSeq - payloads.length;
    const createdAt = new Date().toISOString();

    const events = await tx
      .insert(eventsTable)
      .values(
        payloads.map((payload, index) => ({
          shareId,
          seq: firstSeq + (index + 1),
          type: payload.$type,
          subjectId: subjectIdFromPayload(payload),
          actorId,
          createdAt,
        })),
      )
      .returning();

    for (const [index, payload] of payloads.entries()) {
      await applyPayload(
        tx,
        {shareId, actorId, seq: firstSeq + (index + 1), createdAt},
        payload,
      );
    }

    return events;
  });
}
