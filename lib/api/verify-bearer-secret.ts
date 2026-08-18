import 'server-only';

import {timingSafeEqual} from 'node:crypto';

import {isPresent} from '@/lib/utils/is-present';

export function verifyBearerSecret(
  request: Request,
  secret: string | undefined,
) {
  if (!isPresent(secret)) {
    return false;
  }

  const expected = `Bearer ${secret}`;
  const provided = request.headers.get('authorization');
  if (!isPresent(provided)) {
    return false;
  }

  return (
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  );
}
