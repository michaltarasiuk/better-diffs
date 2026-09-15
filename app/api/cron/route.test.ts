import {NextRequest} from 'next/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {env} from '@/env';
import {isDefined} from '@/utils/defined';

import {GET} from './route';

const {deleteExpiredShares} = vi.hoisted(() => ({
  deleteExpiredShares: vi.fn<() => number>(),
}));

vi.mock('@/db/shares', () => ({deleteExpiredShares}));

const ENDPOINT = `${env.BASE_URL}/api/cron`;

function get(authorization?: string) {
  return new NextRequest(ENDPOINT, {
    headers: {
      ...(isDefined(authorization) ? {authorization} : {}),
    },
  });
}

beforeEach(() => {
  deleteExpiredShares.mockReset();
  deleteExpiredShares.mockResolvedValue(3);
});

describe('GET', () => {
  it('sweeps expired shares for an authorized caller', async () => {
    const response = await GET(get('Bearer cron-secret'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ok: true, changes: 3});
    expect(deleteExpiredShares).toHaveBeenCalledWith({maxAgeHours: 24});
  });

  it('reports a sweep that deleted nothing', async () => {
    deleteExpiredShares.mockResolvedValue(0);

    const response = await GET(get('Bearer cron-secret'));

    await expect(response.json()).resolves.toEqual({ok: true, changes: 0});
  });

  it.each([
    {name: 'an unauthenticated caller', authorization: undefined},
    {name: 'a wrong secret', authorization: 'Bearer invalid'},
  ])('rejects $name without touching the database', async ({authorization}) => {
    const response = await GET(get(authorization));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
    });
    expect(deleteExpiredShares).not.toHaveBeenCalled();
  });
});
