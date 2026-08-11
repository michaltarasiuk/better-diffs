import {timingSafeEqual} from 'node:crypto';

import {deleteExpired} from '@/lib/db/cleanup';
import {env} from '@/lib/env';
import {isDefined} from '@/lib/is-defined';

function isAuthenticated(request: Request) {
  const secret = env.CRON_SECRET;
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

export function GET(request: Request) {
  if (!isAuthenticated(request)) {
    return Response.json({ok: false}, {status: 401});
  }

  const changes = deleteExpired({maxAgeHours: 24}).changes;

  return Response.json({ok: true, changes});
}
