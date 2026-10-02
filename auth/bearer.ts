import 'server-only';

import {timingSafeEqual} from 'node:crypto';

import {Authorization} from '@/headers/authorization';
import {isDefined} from '@/utils/is-defined';

export function hasBearerToken(request: Request, secret: string | undefined) {
  if (!isDefined(secret)) {
    return false;
  }

  const authorization = Authorization.from(
    request.headers.get('authorization'),
  );
  if (!authorization.hasScheme('Bearer')) {
    return false;
  }
  if (!isDefined(authorization.credentials)) {
    return false;
  }

  const actual = Buffer.from(authorization.credentials);
  const expected = Buffer.from(secret);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
