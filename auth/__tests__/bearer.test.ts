import {describe, expect, it} from 'vitest';

import {env} from '@/env';
import {isDefined} from '@/utils/is-defined';

import {hasBearerToken} from '../bearer';

const SECRET = env.CRON_SECRET!;

function request(authorization?: string) {
  const headers = new Headers();
  if (isDefined(authorization)) {
    headers.set('Authorization', authorization);
  }
  return new Request(env.BASE_URL, {headers});
}

describe('hasBearerToken', () => {
  it('accepts the matching token', () => {
    expect(hasBearerToken(request(`Bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it('accepts a lowercase scheme', () => {
    expect(hasBearerToken(request(`bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it('rejects every request when the secret is unset', () => {
    expect(hasBearerToken(request(`Bearer ${SECRET}`), undefined)).toBe(false);
  });

  it.each([
    ['a missing header', undefined],
    ['a missing token', 'Bearer'],
    ['another scheme', `Basic ${SECRET}`],
    ['a wrong token', `Bearer ${SECRET.toUpperCase()}`],
    ['a shorter token', `Bearer ${SECRET.slice(0, -1)}`],
    ['a longer token', `Bearer ${SECRET}x`],
  ])('rejects %s', (_name, authorization) => {
    expect(hasBearerToken(request(authorization), SECRET)).toBe(false);
  });
});
