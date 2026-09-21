import {describe, expect, it} from 'vitest';

import {env} from '@/env';
import {isDefined} from '@/utils/is-defined';
import {verifyBearerSecret} from './bearer';

function request(authorization?: string) {
  return new Request(`${env.BASE_URL}/api/cron`, {
    headers: isDefined(authorization) ? {authorization} : {},
  });
}

describe('verifyBearerSecret', () => {
  it('accepts a matching bearer token', () => {
    expect(
      verifyBearerSecret(request(`Bearer ${env.CRON_SECRET}`), env.CRON_SECRET),
    ).toBe(true);
  });

  it.each([
    {name: 'missing authorization', authorization: undefined},
    {name: 'invalid secret', authorization: 'Bearer invalid'},
    {name: 'missing bearer prefix', authorization: env.CRON_SECRET},
    {name: 'wrong scheme', authorization: `Basic ${env.CRON_SECRET}`},
  ])('rejects $name', ({authorization}) => {
    expect(verifyBearerSecret(request(authorization), env.CRON_SECRET)).toBe(
      false,
    );
  });
});
