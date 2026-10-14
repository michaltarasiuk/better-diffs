import {eq} from 'drizzle-orm';
import {describe, expect, it} from 'vitest';

import {ageShare, setupTestDb} from '@/db/__tests__/setup';
import {db} from '@/db/db';
import {shares} from '@/db/schema';
import {createShare} from '@/db/shares';
import {fileDiffs, gitPatch} from '@/diffs/__tests__/patches';
import {env} from '@/env';
import {newId} from '@/utils/new-id';

import {GET} from '../route';

setupTestDb();

function get(shareId: string) {
  const request = new Request(`${env.BASE_URL}/api/shares/${shareId}/patch`);
  return GET(request, {params: Promise.resolve({shareId})});
}

async function lastVisitedAt(shareId: string) {
  const [share] = await db
    .select({lastVisitedAt: shares.lastVisitedAt})
    .from(shares)
    .where(eq(shares.id, shareId));
  return share?.lastVisitedAt;
}

describe('GET', () => {
  it('returns the uploaded patch text', async () => {
    const text = gitPatch('a.txt', 'b.txt');
    const shareId = await createShare(text, [fileDiffs('a.txt', 'b.txt')]);

    const response = await get(shareId);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'text/x-diff; charset=utf-8',
    );
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    await expect(response.text()).resolves.toBe(text);
  });

  it('is never cached', async () => {
    const shareId = await createShare('', []);

    const response = await get(shareId);

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('refreshes the last visit', async () => {
    const shareId = await createShare('', []);
    await ageShare(shareId, 48);
    const before = await lastVisitedAt(shareId);

    await get(shareId);

    expect(await lastVisitedAt(shareId)).not.toBe(before);
  });

  it('responds 404 for a missing share', async () => {
    const response = await get(newId());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {reason: 'SHARE_NOT_FOUND'},
    });
  });
});
