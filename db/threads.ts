import 'server-only';

import {and, asc, eq, gt, inArray, sql} from 'drizzle-orm';

import {threadError, type ThreadError} from '#/threads/errors';
import type {Change, StoredIds} from '#/threads/schemas';
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

async function getStoredIds(
  tx: Transaction,
  shareId: string,
  changes: readonly Change[],
) {
  const files = await tx
    .select({id: filesTable.id})
    .from(filesTable)
    .innerJoin(patchesTable, eq(filesTable.patchId, patchesTable.id))
    .where(
      and(
        eq(patchesTable.shareId, shareId),
        inArray(
          filesTable.id,
          changes.flatMap((change) =>
            change.type === 'openThread' ? [change.anchor.fileId] : [],
          ),
        ),
      ),
    );
  const threads = await tx
    .select({id: threadsTable.id, shareId: threadsTable.shareId})
    .from(threadsTable)
    .where(
      inArray(
        threadsTable.id,
        changes.map(({threadId}) => threadId),
      ),
    );
  const comments = await tx
    .select({id: commentsTable.id})
    .from(commentsTable)
    .where(
      inArray(
        commentsTable.id,
        changes.flatMap((change) =>
          change.type === 'createComment' ? [change.commentId] : [],
        ),
      ),
    );

  return {
    fileIds: files.map(({id}) => id),
    threadIds: threads
      .filter((thread) => thread.shareId === shareId)
      .map(({id}) => id),
    otherThreadIds: threads
      .filter((thread) => thread.shareId !== shareId)
      .map(({id}) => id),
    commentIds: comments.map(({id}) => id),
  };
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
  switch (change.type) {
    case 'openThread': {
      const {fileId, side, line} = change.anchor;
      await tx.insert(threadsTable).values({
        id: change.threadId,
        shareId,
        fileId,
        side,
        line,
        actorId,
        createdAt,
      });
      break;
    }
    case 'createComment':
      await tx.insert(commentsTable).values({
        id: change.commentId,
        shareId,
        threadId: change.threadId,
        actorId,
        body: change.body,
        createdAt,
      });
      break;
    default:
      change satisfies never;
  }
}

export async function saveChanges(
  shareId: string,
  actorId: string,
  changes: readonly Change[],
  validate: (stored: StoredIds) => ThreadError | undefined,
) {
  if (changes.length === 0) {
    return undefined;
  }

  return db.transaction(async (tx) => {
    const [share] = await tx
      .select({id: sharesTable.id})
      .from(sharesTable)
      .where(eq(sharesTable.id, shareId));
    if (!isDefined(share)) {
      return threadError('SHARE_NOT_FOUND', `Share not found: ${shareId}`);
    }

    const error = validate(await getStoredIds(tx, shareId, changes));
    if (isDefined(error)) {
      return error;
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
      await write(tx, {shareId, actorId, createdAt}, change);
    }
    return undefined;
  });
}
