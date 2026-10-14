import {eq} from 'drizzle-orm';
import type {SerializedEditorState} from 'lexical';
import {describe, expect, it} from 'vitest';

import {fileDiffs, gitPatch} from '@/diffs/__tests__/patches';
import type {Change} from '@/threads/schemas';
import {newId} from '@/utils/new-id';

import {db} from '../db';
import {comments, files, patches, shares, threads} from '../schema';
import {
  createShare,
  deleteExpiredShares,
  getShareFiles,
  getSharePatch,
  touchShare,
} from '../shares';
import {saveChanges} from '../threads';
import {ageShare, allowAll, hasShare, insertUser, setupTestDb} from './setup';

setupTestDb();

function countRows(
  table: typeof patches | typeof files | typeof threads | typeof comments,
) {
  return db.$count(table);
}

async function getShare(id: string) {
  const [share] = await db.select().from(shares).where(eq(shares.id, id));
  return share;
}

describe('createShare', () => {
  it('stores files in patch order', async () => {
    const id = await createShare('', [
      fileDiffs('b.txt', 'a.txt'),
      fileDiffs('c.txt'),
    ]);

    const opened = await getShareFiles(id);

    expect(opened.map(({name}) => name)).toEqual(['b.txt', 'a.txt', 'c.txt']);
  });

  it('stores the file metadata', async () => {
    const [file] = fileDiffs('a.txt');
    const id = await createShare('', [[file!]]);

    const [opened] = await getShareFiles(id);

    expect(opened?.metadata).toEqual(file);
  });

  it('creates an empty share without patches', async () => {
    const id = await createShare('', []);

    await expect(getShareFiles(id)).resolves.toEqual([]);
  });
});

describe('getSharePatch', () => {
  it('returns the uploaded patch text', async () => {
    const text = gitPatch('a.txt');
    const id = await createShare(text, [fileDiffs('a.txt')]);

    await expect(getSharePatch(id)).resolves.toBe(text);
  });

  it('returns undefined for a missing share', async () => {
    await expect(getSharePatch(newId())).resolves.toBeUndefined();
  });
});

describe('touchShare', () => {
  it('refreshes the last visit', async () => {
    const id = await createShare('', []);
    await ageShare(id, 48);
    const before = await getShare(id);

    await expect(touchShare(id)).resolves.toBe(true);

    const after = await getShare(id);
    expect(after!.lastVisitedAt > before!.lastVisitedAt).toBe(true);
  });

  it('returns false for an unknown share', async () => {
    await expect(touchShare(newId())).resolves.toBe(false);
  });
});

describe('getShareFiles', () => {
  it('returns no files for an unknown share', async () => {
    await expect(getShareFiles(newId())).resolves.toEqual([]);
  });

  it('only returns files of the opened share', async () => {
    const id = await createShare('', [fileDiffs('a.txt')]);
    await createShare('', [fileDiffs('other.txt')]);

    const opened = await getShareFiles(id);

    expect(opened.map(({name}) => name)).toEqual(['a.txt']);
  });
});

function openThread(shareId: string) {
  const threadId = newId();
  return [
    {
      $type: 'thread.opened',
      threadId,
      anchor: {shareId, filePath: 'a.txt', side: 'additions', line: 1},
    },
    {
      $type: 'comment.created',
      threadId,
      commentId: newId(),
      body: {root: {}} as SerializedEditorState,
    },
  ] satisfies Change[];
}

describe('saveChanges', () => {
  it('refreshes the last visit', async () => {
    const {id: actorId} = await insertUser();
    const id = await createShare('', []);
    await ageShare(id, 48);
    const before = await getShare(id);

    await saveChanges(id, actorId, openThread(id), allowAll);

    const after = await getShare(id);
    expect(after!.lastVisitedAt > before!.lastVisitedAt).toBe(true);
  });
});

describe('deleteExpiredShares', () => {
  it('deletes shares not visited within the max age', async () => {
    const expired = await createShare('', []);
    const fresh = await createShare('', []);
    await ageShare(expired, 25);
    await ageShare(fresh, 23);

    await expect(deleteExpiredShares({maxAgeHours: 24})).resolves.toBe(1);
    await expect(hasShare(expired)).resolves.toBe(false);
    await expect(hasShare(fresh)).resolves.toBe(true);
  });

  it('keeps pinned shares however long ago they were visited', async () => {
    const pinned = await createShare('', []);
    await db.update(shares).set({pinned: true}).where(eq(shares.id, pinned));
    await ageShare(pinned, 48);

    await expect(deleteExpiredShares({maxAgeHours: 24})).resolves.toBe(0);
    await expect(hasShare(pinned)).resolves.toBe(true);
  });

  it('deletes the patches, files, threads and comments of expired shares', async () => {
    const {id: actorId} = await insertUser();
    const id = await createShare('', [fileDiffs('a.txt', 'b.txt')]);
    await saveChanges(id, actorId, openThread(id), allowAll);
    await ageShare(id, 25);

    await deleteExpiredShares({maxAgeHours: 24});

    expect(await countRows(patches)).toBe(0);
    expect(await countRows(files)).toBe(0);
    expect(await countRows(threads)).toBe(0);
    expect(await countRows(comments)).toBe(0);
  });

  it('returns zero when nothing expired', async () => {
    await createShare('', []);

    await expect(deleteExpiredShares({maxAgeHours: 24})).resolves.toBe(0);
  });
});
