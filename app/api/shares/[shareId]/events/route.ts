import {type NextRequest, NextResponse} from 'next/server';

import {getEvents} from '@/db/events';
import {loadEventsSearchParams} from './_lib/search-params';

const CACHE_CONTROL = 'no-store';

export async function GET(
  request: NextRequest,
  {params}: RouteContext<'/api/shares/[shareId]/events'>,
) {
  const [{shareId}, {afterSeq}] = await Promise.all([
    params,
    loadEventsSearchParams(request),
  ]);

  const events = await getEvents(shareId, afterSeq);

  return NextResponse.json(
    {ok: true, events},
    {headers: {'Cache-Control': CACHE_CONTROL}},
  );
}
