import {eq, sql} from 'drizzle-orm';
import {describe, expect, it} from 'vitest';

import {ageShare, hasShare, setupTestDb} from '#/db/__tests__/setup';
import {db} from '#/db/db';
import {shares} from '#/db/schema/index';
import {createShare} from '#/db/shares';
import {env} from '#/env';

import {GET} from '../route';

setupTestDb();

function get(headers: HeadersInit = {}) {
  return GET(new Request(`${env.BASE_URL}/api/cron`, {headers}), {});
}

describe('GET', () => {
  it('deletes shares not visited for a week', async () => {
    const expired = await createShare('', []);
    const fresh = await createShare('', []);
    await ageShare(fresh, 7 * 24 - 1);
    await ageShare(expired, 7 * 24 + 1);

    const response = await get({Authorization: `Bearer ${env.CRON_SECRET}`});

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({deletedCount: 1});
    await expect(hasShare(expired)).resolves.toBe(false);
    await expect(hasShare(fresh)).resolves.toBe(true);
  });

  it('forgets who uploaded shares older than an hour', async () => {
    const old = await createShare('', [], 'old-uploader');
    const recent = await createShare('', [], 'recent-uploader');
    await db
      .update(shares)
      .set({createdAt: sql`datetime('now', '-2 hours')`})
      .where(eq(shares.id, old));

    await get({Authorization: `Bearer ${env.CRON_SECRET}`});

    const rows = await db
      .select({id: shares.id, uploaderKey: shares.uploaderKey})
      .from(shares);
    expect(rows).toEqual(
      expect.arrayContaining([
        {id: old, uploaderKey: null},
        {id: recent, uploaderKey: 'recent-uploader'},
      ]),
    );
  });

  it.each([
    ['a missing token', {}],
    ['a wrong token', {Authorization: 'Bearer wrong'}],
  ])('rejects %s', async (_name, headers) => {
    const expired = await createShare('', []);
    await ageShare(expired, 7 * 24 + 1);

    const response = await get(headers);

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
    await expect(hasShare(expired)).resolves.toBe(true);
  });
});
