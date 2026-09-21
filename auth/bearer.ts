import 'server-only';

import {timingSafeEqual} from 'node:crypto';

import {isDefined} from '@/utils/is-defined';

export function verifyBearerSecret(
  request: Request,
  secret: string | undefined,
) {
  if (!isDefined(secret)) {
    return false;
  }

  const provided = request.headers.get('authorization');
  if (!isDefined(provided)) {
    return false;
  }

  const expected = `Bearer ${secret}`;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
