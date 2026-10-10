import {eq} from 'drizzle-orm';
import {describe, expect, it} from 'vitest';

import {fileDiffs} from '@/diffs/__tests__/patches';
import {newId} from '@/utils/new-id';

import {db} from '../db';
import {appendEvents} from '../events';
import {events, files, patches, shares} from '../schema';
import {createShare, deleteExpiredShares, hasShare, openShare} from '../shares';
import {ageShare, insertUser, setupTestDb} from './setup';

setupTestDb();

function countRows(table: typeof patches | typeof files | typeof events) {
  return db.$count(table);
}

async function getShare(id: string) {
  const [share] = await db.select().from(shares).where(eq(shares.id, id));
  return share;
}

describe('createShare', () => {
  it('stores files in patch order', async () => {
    const id = await createShare([
      fileDiffs('b.ts', 'a.ts'),
      fileDiffs('c.ts'),
    ]);

    const opened = await openShare(id);

    expect(opened?.map(({name}) => name)).toEqual(['b.ts', 'a.ts', 'c.ts']);
  });

  it('stores the file metadata', async () => {
    const [file] = fileDiffs('a.ts');
    const id = await createShare([[file!]]);

    const [opened] = (await openShare(id))!;

    expect(opened?.metadata).toEqual(file);
  });

  it('creates an empty share without patches', async () => {
    const id = await createShare([]);

    await expect(openShare(id)).resolves.toEqual([]);
  });
});

describe('hasShare', () => {
  it('finds a created share', async () => {
    const id = await createShare([]);

    await expect(hasShare(id)).resolves.toBe(true);
  });

  it('returns false for an unknown share', async () => {
    await expect(hasShare(newId())).resolves.toBe(false);
  });
});

describe('openShare', () => {
  it('returns null for an unknown share', async () => {
    await expect(openShare(newId())).resolves.toBe(null);
  });

  it('only returns files of the opened share', async () => {
    const id = await createShare([fileDiffs('a.ts')]);
    await createShare([fileDiffs('other.ts')]);

    const opened = await openShare(id);

    expect(opened?.map(({name}) => name)).toEqual(['a.ts']);
  });

  it('refreshes the last visit', async () => {
    const id = await createShare([]);
    await ageShare(id, 48);
    const before = await getShare(id);

    await openShare(id);

    const after = await getShare(id);
    expect(after!.lastVisitedAt > before!.lastVisitedAt).toBe(true);
  });
});

describe('deleteExpiredShares', () => {
  it('deletes shares not visited within the max age', async () => {
    const expired = await createShare([]);
    const fresh = await createShare([]);
    await ageShare(expired, 25);
    await ageShare(fresh, 23);

    await expect(deleteExpiredShares({maxAgeHours: 24})).resolves.toBe(1);
    await expect(hasShare(expired)).resolves.toBe(false);
    await expect(hasShare(fresh)).resolves.toBe(true);
  });

  it('deletes the patches, files and events of expired shares', async () => {
    const {id: actorId} = await insertUser();
    const id = await createShare([fileDiffs('a.ts', 'b.ts')]);
    await appendEvents(id, actorId, [
      {$type: 'thread.resolved', threadId: newId()},
    ]);
    await ageShare(id, 25);

    await deleteExpiredShares({maxAgeHours: 24});

    expect(await countRows(patches)).toBe(0);
    expect(await countRows(files)).toBe(0);
    expect(await countRows(events)).toBe(0);
  });

  it('returns zero when nothing expired', async () => {
    await createShare([]);

    await expect(deleteExpiredShares({maxAgeHours: 24})).resolves.toBe(0);
  });
});
