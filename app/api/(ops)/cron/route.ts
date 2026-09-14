import type {NextRequest} from 'next/server';

import {env} from '@/env';
import {verifyBearerSecret} from '@/auth/bearer';
import {deleteExpiredShares} from '@/db/shares';

export async function GET(request: NextRequest) {
  if (!verifyBearerSecret(request, env.CRON_SECRET)) {
    return Response.json({ok: false, error: 'Unauthorized'}, {status: 401});
  }

  const changes = await deleteExpiredShares({maxAgeHours: 24});

  return Response.json({ok: true, changes});
}
