import {type NextRequest, NextResponse} from 'next/server';

import {env} from '@/env';
import {verifyBearerSecret} from '@/auth/bearer';
import {deleteExpiredShares} from '@/db/shares';

const SHARE_MAX_AGE_HOURS = 24;

export async function GET(request: NextRequest) {
  if (!verifyBearerSecret(request, env.CRON_SECRET)) {
    return NextResponse.json({ok: false, error: 'Unauthorized'}, {status: 401});
  }

  const changes = await deleteExpiredShares({maxAgeHours: SHARE_MAX_AGE_HOURS});

  return NextResponse.json({ok: true, changes});
}
