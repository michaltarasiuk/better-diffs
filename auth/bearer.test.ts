import {describe, expect, it} from 'vitest';

import {env} from '@/env';
import {isDefined} from '@/utils/defined';

import {verifyBearerSecret} from './bearer';

const SECRET = 'cron-secret';

function request(authorization?: string) {
  return new Request(`${env.BASE_URL}/api/cron`, {
    headers: isDefined(authorization) ? {authorization} : {},
  });
}

describe('verifyBearerSecret', () => {
  it('accepts the matching bearer token', () => {
    expect(verifyBearerSecret(request(`Bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it('refuses every request when no secret is configured', () => {
    expect(verifyBearerSecret(request(`Bearer ${SECRET}`), undefined)).toBe(
      false,
    );
    expect(verifyBearerSecret(request('Bearer '), undefined)).toBe(false);
  });

  it('refuses a request without an authorization header', () => {
    expect(verifyBearerSecret(request(), SECRET)).toBe(false);
  });

  it.each([
    {name: 'a different secret', header: 'Bearer invalid'},
    {name: 'a same-length secret', header: `Bearer ${'x'.repeat(11)}`},
    {name: 'the bare secret', header: SECRET},
    {name: 'a lower-cased scheme', header: `bearer ${SECRET}`},
    {name: 'a different scheme', header: `Basic ${SECRET}`},
    {name: 'padding inside the header', header: `Bearer  ${SECRET}`},
    {name: 'an empty header', header: ''},
  ])('refuses $name', ({header}) => {
    expect(verifyBearerSecret(request(header), SECRET)).toBe(false);
  });

  it('compares the whole token rather than a prefix', () => {
    expect(verifyBearerSecret(request('Bearer cron-secretX'), SECRET)).toBe(
      false,
    );
    expect(verifyBearerSecret(request('Bearer cron-secre'), SECRET)).toBe(
      false,
    );
  });
});
