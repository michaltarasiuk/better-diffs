import {describe, expect, it} from 'vitest';

import {ageShare, setupTestDb} from '@/db/__tests__/setup';
import {createShare, shareExists} from '@/db/shares';
import {env} from '@/env';

import {GET} from '../route';

setupTestDb();

function get(headers: HeadersInit = {}) {
  return GET(new Request(`${env.BASE_URL}/api/cron`, {headers}), {});
}

describe('GET', () => {
  it('deletes shares not visited for a day', async () => {
    const expired = await createShare([]);
    const fresh = await createShare([]);
    await ageShare(expired, 25);

    const response = await get({Authorization: `Bearer ${env.CRON_SECRET}`});

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({deletedCount: 1});
    await expect(shareExists(expired)).resolves.toBe(false);
    await expect(shareExists(fresh)).resolves.toBe(true);
  });

  it.each([
    ['a missing token', {}],
    ['a wrong token', {Authorization: 'Bearer wrong'}],
  ])('rejects %s', async (_name, headers) => {
    const expired = await createShare([]);
    await ageShare(expired, 25);

    const response = await get(headers);

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
    await expect(shareExists(expired)).resolves.toBe(true);
  });
});
