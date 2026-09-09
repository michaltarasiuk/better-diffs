import {NextResponse, type NextRequest} from 'next/server';

import {getEvents} from '@/data/events';

import {loadEventsSearchParams} from './searchParams';

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
