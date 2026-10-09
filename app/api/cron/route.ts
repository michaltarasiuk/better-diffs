import {NextResponse, type NextRequest} from 'next/server';
import {unauthorized} from 'next/navigation';

import {hasBearerToken} from '@/auth/bearer';
import {deleteExpiredShares} from '@/db/shares';
import {env} from '@/env';

const SHARE_MAX_AGE_HOURS = 24;

export async function GET(request: NextRequest) {
  if (!hasBearerToken(request, env.CRON_SECRET)) {
    unauthorized();
  }

  const changes = await deleteExpiredShares({maxAgeHours: SHARE_MAX_AGE_HOURS});

  return NextResponse.json({ok: true, changes});
}
