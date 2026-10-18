import 'server-only';

import {and, asc, eq, gt, sql, type SQL} from 'drizzle-orm';
import type {SQLiteTable} from 'drizzle-orm/sqlite-core';

import {
  threadError,
  type ThreadError,
  type ThreadErrorReason,
} from '#/threads/errors';
import type {Change} from '#/threads/schemas';
import {isDefined} from '#/utils/is-defined';

import {db} from './db';
import {
  comments as commentsTable,
  files as filesTable,
  patches as patchesTable,
  shares as sharesTable,
  threads as threadsTable,
  user as userTable,
} from './schema';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

    const threads = await tx
      .select({
        id: threadsTable.id,
        anchor: {
          fileId: threadsTable.fileId,
          side: threadsTable.side,
          line: threadsTable.line,
        },
        actorId: threadsTable.actorId,
        actor: {
          name: userTable.name,
          image: userTable.image,
        },
        createdAt: threadsTable.createdAt,
      })
      .from(threadsTable)
      .innerJoin(userTable, eq(threadsTable.actorId, userTable.id))
      .where(eq(threadsTable.shareId, shareId));
    const comments = await tx
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
      .where(eq(commentsTable.shareId, shareId))
      .orderBy(asc(commentsTable.createdAt), asc(sql`${commentsTable}.rowid`));

    return {revision: share.revision, threads, comments};
  });
}

class Refusal extends Error {
  constructor(readonly threadError: ThreadError) {
    super(threadError.message);
  }
}

function refuse(reason: ThreadErrorReason, message: string) {
  throw new Refusal(threadError(reason, message));
}

async function exists(
  tx: Transaction,
  table: SQLiteTable,
  where: SQL | undefined,
) {
  return (await tx.$count(table, where)) > 0;
}

async function applyChange(
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
  switch (change.type) {
    case 'openThread': {
      const {threadId} = change;
      const {fileId, side, line} = change.anchor;
      if (await exists(tx, threadsTable, eq(threadsTable.id, threadId))) {
        refuse('THREAD_ALREADY_EXISTS', `Thread already exists: ${threadId}`);
      }
      const [file] = await tx
        .select({id: filesTable.id})
        .from(filesTable)
        .innerJoin(patchesTable, eq(filesTable.patchId, patchesTable.id))
        .where(
          and(eq(filesTable.id, fileId), eq(patchesTable.shareId, shareId)),
        );
      if (!isDefined(file)) {
        refuse('FILE_NOT_FOUND', `File not found: ${fileId}`);
      }

      await tx.insert(threadsTable).values({
        id: threadId,
        shareId,
        fileId,
        side,
        line,
        actorId,
        createdAt,
      });
      break;
    }
    case 'createComment': {
      const {threadId, commentId, body} = change;
      const thread = and(
        eq(threadsTable.id, threadId),
        eq(threadsTable.shareId, shareId),
      );
      if (!(await exists(tx, threadsTable, thread))) {
        refuse('THREAD_NOT_FOUND', `Thread not found: ${threadId}`);
      }
      if (await exists(tx, commentsTable, eq(commentsTable.id, commentId))) {
        refuse(
          'COMMENT_ALREADY_EXISTS',
          `Comment already exists: ${commentId}`,
        );
      }

      await tx.insert(commentsTable).values({
        id: commentId,
        shareId,
        threadId,
        actorId,
        body,
        createdAt,
      });
      break;
    }
    default:
      change satisfies never;
  }
}

export async function saveChanges(
  shareId: string,
  actorId: string,
  changes: readonly Change[],
) {
  if (changes.length === 0) {
    return undefined;
  }

  try {
    await db.transaction(async (tx) => {
      if (!(await exists(tx, sharesTable, eq(sharesTable.id, shareId)))) {
        refuse('SHARE_NOT_FOUND', `Share not found: ${shareId}`);
      }

      await tx
        .update(sharesTable)
        .set({
          revision: sql`${sharesTable.revision} + 1`,
          lastVisitedAt: sql`datetime('now')`,
        })
        .where(eq(sharesTable.id, shareId));

      const createdAt = new Date().toISOString();
      for (const change of changes) {
        await applyChange(tx, {shareId, actorId, createdAt}, change);
      }
    });
  } catch (error) {
    if (error instanceof Refusal) {
      return error.threadError;
    }
    throw error;
  }
  return undefined;
}
