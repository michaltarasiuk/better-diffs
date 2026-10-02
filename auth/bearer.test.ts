import {describe, expect, it} from 'vitest';

import {env} from '@/env';
import {isDefined} from '@/utils/is-defined';
import {hasBearerToken} from './bearer';

const SECRET = 'bearer-secret';

function request(authorization?: string) {
  return new Request(env.BASE_URL, {
    headers: isDefined(authorization) ? {authorization} : {},
  });
}

describe('hasBearerToken', () => {
  it('accepts a matching bearer token', () => {
    expect(hasBearerToken(request(`Bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it('accepts a lowercase bearer scheme', () => {
    expect(hasBearerToken(request(`bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it('rejects any token when none is expected', () => {
    expect(hasBearerToken(request(`Bearer ${SECRET}`), undefined)).toBe(false);
  });

  it.each([
    {
      name: 'missing authorization',
      authorization: undefined,
    },
    {
      name: 'invalid token',
      authorization: 'Bearer invalid',
    },
    {
      name: 'same-length invalid token',
      authorization: `Bearer ${'x'.repeat(SECRET.length)}`,
    },
    {
      name: 'missing bearer scheme',
      authorization: SECRET,
    },
    {
      name: 'wrong scheme',
      authorization: `Basic ${SECRET}`,
    },
  ])('rejects $name', ({authorization}) => {
    expect(hasBearerToken(request(authorization), SECRET)).toBe(false);
  });
});
