import {verifyBearerSecret} from '@/lib/api/verify-bearer-secret';
import {deleteExpiredShares} from '@/lib/db/shares';
import {env} from '@/lib/env';

export function GET(request: Request) {
  if (!verifyBearerSecret(request, env.CRON_SECRET)) {
    return Response.json({ok: false}, {status: 401});
  }

  const changes = deleteExpiredShares({maxAgeHours: 24}).changes;

  return Response.json({ok: true, changes});
}
