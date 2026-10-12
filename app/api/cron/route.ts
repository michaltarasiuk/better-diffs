import {hasBearerToken} from '@/auth/bearer';
import {deleteExpiredShares} from '@/db/shares';
import {env} from '@/env';
import {ApiError} from '@/http/error';
import {route} from '@/http/route';

const SHARE_MAX_AGE_HOURS = 24;

export const GET = route(async (request) => {
  if (!hasBearerToken(request, env.CRON_SECRET)) {
    throw new ApiError('UNAUTHENTICATED', 'Missing or invalid bearer token.', {
      reason: 'INVALID_BEARER_TOKEN',
    });
  }

  const deletedCount = await deleteExpiredShares({
    maxAgeHours: SHARE_MAX_AGE_HOURS,
  });

  return Response.json({deletedCount});
});
