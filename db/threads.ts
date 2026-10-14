import 'server-only';

import {and, asc, eq, gt, inArray, type SQL, sql} from 'drizzle-orm';

import type {Change, ShareRows} from '@/threads/schemas';
import {isDefined} from '@/utils/is-defined';

import {db} from './db';
import {
  comments as commentsTable,
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
    .orderBy(asc(commentsTable.createdAt), asc(sql`${commentsTable}.rowid`));
}

export async function getSnapshot(shareId: string, afterRevision = -1) {
  return db.transaction(async (tx) => {
    const [share] = await tx
      .select({revision: sharesTable.revision})
      .from(sharesTable)
      .where(
        and(
          eq(sharesTable.id, shareId),
          gt(sharesTable.revision, afterRevision),
        ),
      );

    if (!isDefined(share)) {
      return undefined;
    }

    const threads = await selectThreads(tx, eq(threadsTable.shareId, shareId));
    const comments = await selectComments(
      tx,
      eq(commentsTable.shareId, shareId),
    );

    return {revision: share.revision, threads, comments};
  });
}

async function getRows(
  tx: Transaction,
  shareId: string,
  changes: readonly Change[],
) {
  const commentIds = changes.flatMap((change) =>
    'commentId' in change ? [change.commentId] : [],
  );
  const comments = await selectComments(
    tx,
    and(
      eq(commentsTable.shareId, shareId),
      inArray(commentsTable.id, commentIds),
    ),
  );

  const threadIds = new Set([
    ...changes.flatMap((change) =>
      'threadId' in change ? [change.threadId] : [],
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

  return {threads, comments};
}

async function write(
  tx: Transaction,
  {
    shareId,
    actorId,
    createdAt,
  }: {
    readonly shareId: string;
    readonly actorId: string;
    readonly createdAt: string;
  },
  change: Change,
) {
  switch (change.$type) {
    case 'thread.opened': {
      const {filePath, side, line} = change.anchor;
      await tx.insert(threadsTable).values({
        id: change.threadId,
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
            eq(threadsTable.id, change.threadId),
            eq(threadsTable.shareId, shareId),
          ),
        );
      break;
    case 'comment.created':
      await tx.insert(commentsTable).values({
        id: change.commentId,
        shareId,
        threadId: change.threadId,
        actorId,
        body: change.body,
        createdAt,
      });
      break;
    case 'comment.edited':
      await tx
        .update(commentsTable)
        .set({body: change.body})
        .where(
          and(
            eq(commentsTable.id, change.commentId),
            eq(commentsTable.shareId, shareId),
          ),
        );
      break;
    case 'comment.deleted':
      await tx
        .delete(commentsTable)
        .where(
          and(
            eq(commentsTable.id, change.commentId),
            eq(commentsTable.shareId, shareId),
          ),
        );
      break;
    default:
      change satisfies never;
  }
}

export async function saveChanges(
  shareId: string,
  actorId: string,
  changes: readonly Change[],
  validate: (rows: ShareRows) => void,
) {
  if (changes.length === 0) {
    return;
  }

  await db.transaction(async (tx) => {
    const [share] = await tx
      .update(sharesTable)
      .set({
        revision: sql`${sharesTable.revision} + 1`,
        lastVisitedAt: sql`datetime('now')`,
      })
      .where(eq(sharesTable.id, shareId))
      .returning({id: sharesTable.id});

    if (!isDefined(share)) {
      throw new Error(`Share not found: ${shareId}`);
    }

    validate(await getRows(tx, shareId, changes));

    const createdAt = new Date().toISOString();
    for (const change of changes) {
      await write(tx, {shareId, actorId, createdAt}, change);
    }
  });
}
