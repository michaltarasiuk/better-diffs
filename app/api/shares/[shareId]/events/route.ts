import {NextResponse, type NextRequest} from 'next/server';

import {getEvents} from '@/db/events';
import {shareExists} from '@/db/shares';

import {loadEventsSearchParams} from './_lib/params';

export async function GET(
  request: NextRequest,
  {params}: RouteContext<'/api/shares/[shareId]/events'>,
) {
  const [{shareId}, {afterSeq}] = await Promise.all([
    params,
    loadEventsSearchParams(request),
  ]);

  if (!(await shareExists(shareId))) {
    return NextResponse.json(
      {ok: false, error: `Share not found: ${shareId}`},
      {status: 404},
    );
  }

  const events = await getEvents(shareId, afterSeq);

  return NextResponse.json(
    {ok: true, events},
    {headers: {'Cache-Control': 'no-store'}},
  );
}
