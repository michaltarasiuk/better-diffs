import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {hasBearerToken} from '@/auth/bearer';
import {deleteExpiredShares} from '@/db/shares';
import {env} from '@/env';

const SHARE_MAX_AGE_HOURS = 24;

export async function GET(request: NextRequest) {
  if (!hasBearerToken(request, env.CRON_SECRET)) {
    return NextResponse.json({ok: false, error: 'Unauthorized'}, {status: 401});
  }

  const changes = await deleteExpiredShares({maxAgeHours: SHARE_MAX_AGE_HOURS});

  return NextResponse.json({ok: true, changes});
}
