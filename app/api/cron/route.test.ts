import {NextRequest} from 'next/server';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET', () => {
  it('returns the delete count when authorized', async () => {
    const response = await GET(request(`Bearer ${env.CRON_SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      changes: DELETED_SHARES,
    });
  });

  it('runs deleteExpiredShares when authorized', async () => {
    await GET(request(`Bearer ${env.CRON_SECRET}`));

    expect(deleteExpiredShares).toHaveBeenCalledOnce();
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
  });

  it.each([
    {name: 'missing authorization', authorization: undefined},
    {name: 'invalid secret', authorization: 'Bearer invalid'},
  ])('skips deletion for $name', async ({authorization}) => {
    await GET(request(authorization));

    expect(deleteExpiredShares).not.toHaveBeenCalled();
  });
});
