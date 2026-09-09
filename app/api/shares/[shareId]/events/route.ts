import {NextResponse, type NextRequest} from 'next/server';

import {getEvents} from '@/lib/db/events';

import {loadEventsSearchParams} from './_lib/search-params';

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
    {headers: {'Cache-Control': 'no-store'}},
  );
}
