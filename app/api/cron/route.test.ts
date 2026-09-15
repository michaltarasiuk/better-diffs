import {NextRequest} from 'next/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {env} from '@/env';
import {isDefined} from '@/utils/defined';
import {GET} from './route';

const {deleteExpiredShares} = vi.hoisted(() => ({
  deleteExpiredShares: vi.fn<() => number>(),
}));

vi.mock('@/db/shares', () => ({deleteExpiredShares}));

const DELETED_SHARES = 3;

function request(authorization?: string) {
  return new NextRequest(`${env.BASE_URL}/api/cron`, {
    headers: {
      ...(isDefined(authorization) && {authorization}),
    },
  });
}

beforeEach(() => {
  deleteExpiredShares.mockReset();
  deleteExpiredShares.mockResolvedValue(DELETED_SHARES);
});

describe('GET', () => {
  it('deletes expired shares when authorized', async () => {
    const response = await GET(request(`Bearer ${env.CRON_SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      changes: DELETED_SHARES,
    });

    expect(deleteExpiredShares).toHaveBeenCalled();
  });

  it.each([
    {name: 'missing authorization', authorization: undefined},
    {name: 'invalid secret', authorization: 'Bearer invalid'},
  ])('returns 401 for $name', async ({authorization}) => {
    const response = await GET(request(authorization));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Unauthorized',
    });

    expect(deleteExpiredShares).not.toHaveBeenCalled();
  });
});
