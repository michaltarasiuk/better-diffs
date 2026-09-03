import {verifyBearerSecret} from '@/lib/auth/bearer';
import {deleteExpiredShares} from '@/lib/db/shares';
import {env} from '@/lib/env';

export async function GET(request: Request) {
  if (!verifyBearerSecret(request, env.CRON_SECRET)) {
    return Response.json({ok: false}, {status: 401});
  }

  const changes = await deleteExpiredShares({maxAgeHours: 24});

  return Response.json({ok: true, changes});
}
