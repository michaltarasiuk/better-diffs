import type {FileDiffMetadata} from '@pierre/diffs';
import {eq} from 'drizzle-orm';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {patches as patchesTable, shares as sharesTable} from './schema';
import type {TestDb} from './test-db';
import {createTestDb} from './test-db';

/*
 * db/shares.ts binds the shared connection at import time, so the mock has
 * to hand back whichever in-memory database the running test just built.
 */
const dbRef = vi.hoisted(() => ({current: null as unknown}));

vi.mock('@/db/db', () => ({
  get db() {
    return dbRef.current;
  },
}));

const {createShare, deleteExpiredShares, openShare} = await import('./shares');

function file(name: string) {
  return {name, hunks: []} as unknown as FileDiffMetadata;
}

/* SQLite's `datetime()` renders UTC as `YYYY-MM-DD HH:MM:SS`. */
function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

async function setLastVisited(id: string, when: string) {
  await db
    .update(sharesTable)
    .set({lastVisitedAt: when})
    .where(eq(sharesTable.id, id));
}

function lastVisitedAt(id: string) {
  return db
    .select({lastVisitedAt: sharesTable.lastVisitedAt})
    .from(sharesTable)
    .where(eq(sharesTable.id, id))
    .then(([row]) => row?.lastVisitedAt);
}

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
  dbRef.current = db;
});

describe('createShare', () => {
  it('stores the share and hands back its id', async () => {
    const shareId = await createShare([[file('src/a.ts')]]);

    await expect(
      db.select().from(sharesTable).where(eq(sharesTable.id, shareId)),
    ).resolves.toHaveLength(1);
  });

  it('gives every share a distinct id', async () => {
    const first = await createShare([[file('src/a.ts')]]);
    const second = await createShare([[file('src/a.ts')]]);

    expect(first).not.toBe(second);
  });

  it('keeps the patches in the order they arrived', async () => {
    const shareId = await createShare([[file('src/a.ts')], [file('src/b.ts')]]);

    const patches = await db
      .select()
      .from(patchesTable)
      .where(eq(patchesTable.shareId, shareId));

    expect(patches.map((patch) => patch.order).toSorted()).toEqual([0, 1]);
  });

  it('keeps the files in the order they arrived within a patch', async () => {
    const shareId = await createShare([
      [file('src/a.ts'), file('src/b.ts'), file('README.md')],
    ]);

    const files = await openShare(shareId);

    expect(files?.map((entry) => entry.name)).toEqual([
      'src/a.ts',
      'src/b.ts',
      'README.md',
    ]);
  });

  it('stores the file metadata as JSON', async () => {
    const shareId = await createShare([[file('src/a.ts')]]);

    const files = await openShare(shareId);

    expect(files?.[0]?.metadata).toEqual({name: 'src/a.ts', hunks: []});
  });

  it('creates a share with no patches at all', async () => {
    const shareId = await createShare([]);

    await expect(openShare(shareId)).resolves.toEqual([]);
    await expect(
      db.select().from(patchesTable).where(eq(patchesTable.shareId, shareId)),
    ).resolves.toEqual([]);
  });

  it('creates a patch that carries no files', async () => {
    const shareId = await createShare([[]]);

    await expect(openShare(shareId)).resolves.toEqual([]);
    await expect(
      db.select().from(patchesTable).where(eq(patchesTable.shareId, shareId)),
    ).resolves.toHaveLength(1);
  });

  it('keeps each share to its own files', async () => {
    const first = await createShare([[file('src/a.ts')]]);
    await createShare([[file('src/b.ts')]]);

    const files = await openShare(first);

    expect(files?.map((entry) => entry.name)).toEqual(['src/a.ts']);
  });
});

describe('openShare', () => {
  it('returns null for a share that does not exist', async () => {
    await expect(
      openShare('00000000-0000-4000-8000-000000000099'),
    ).resolves.toBe(null);
  });

  it('marks the share as visited', async () => {
    const shareId = await createShare([[file('src/a.ts')]]);
    await setLastVisited(shareId, '2020-01-01 00:00:00');

    await openShare(shareId);

    expect(await lastVisitedAt(shareId)).not.toBe('2020-01-01 00:00:00');
  });

  it('does not touch shares it was not asked for', async () => {
    const shareId = await createShare([[file('src/a.ts')]]);
    const other = await createShare([[file('src/b.ts')]]);
    await setLastVisited(other, '2020-01-01 00:00:00');

    await openShare(shareId);

    expect(await lastVisitedAt(other)).toBe('2020-01-01 00:00:00');
  });

  it('returns only the name, id and metadata of each file', async () => {
    const shareId = await createShare([[file('src/a.ts')]]);

    const files = await openShare(shareId);

    expect(Object.keys(files?.[0] ?? {}).toSorted()).toEqual([
      'id',
      'metadata',
      'name',
    ]);
  });
});

describe('deleteExpiredShares', () => {
  it('removes a share that has not been visited within the window', async () => {
    const shareId = await createShare([[file('src/a.ts')]]);
    await setLastVisited(shareId, '2020-01-01 00:00:00');

    await expect(deleteExpiredShares({maxAgeHours: 24})).resolves.toBe(1);
    await expect(openShare(shareId)).resolves.toBe(null);
  });

  it('keeps a share that was just visited', async () => {
    const shareId = await createShare([[file('src/a.ts')]]);

    await expect(deleteExpiredShares({maxAgeHours: 24})).resolves.toBe(0);
    await expect(openShare(shareId)).resolves.not.toBe(null);
  });

  it('removes a share once it falls outside the window', async () => {
    const shareId = await createShare([[file('src/a.ts')]]);
    await setLastVisited(shareId, hoursAgo(2));

    await expect(deleteExpiredShares({maxAgeHours: 1})).resolves.toBe(1);
  });

  it('keeps a share that is still inside the window', async () => {
    const shareId = await createShare([[file('src/a.ts')]]);
    await setLastVisited(shareId, hoursAgo(2));

    await expect(deleteExpiredShares({maxAgeHours: 3})).resolves.toBe(0);
  });

  it('counts every share it removed', async () => {
    for (const name of ['src/a.ts', 'src/b.ts', 'README.md']) {
      const shareId = await createShare([[file(name)]]);
      await setLastVisited(shareId, '2020-01-01 00:00:00');
    }

    await expect(deleteExpiredShares({maxAgeHours: 24})).resolves.toBe(3);
  });

  it('reports nothing removed on an empty table', async () => {
    await expect(deleteExpiredShares({maxAgeHours: 24})).resolves.toBe(0);
  });
});
