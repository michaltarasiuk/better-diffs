import 'server-only';

import {timingSafeEqual} from 'node:crypto';

import {isDefined} from '@/lib/utils/defined';

export function verifyBearerSecret(
  request: Request,
  secret: string | undefined,
) {
  if (!isDefined(secret)) {
    return false;
  }

  const expected = `Bearer ${secret}`;
  const provided = request.headers.get('authorization');
  if (!isDefined(provided)) {
    return false;
  }

  return (
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  );
}
