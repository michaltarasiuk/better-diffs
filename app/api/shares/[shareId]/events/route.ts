import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';

import {getEvents} from '@/lib/db/events';

const SearchParams = z.object({
  afterSeq: z.coerce.number().int().default(0),
});

export async function GET(
  request: NextRequest,
  {params}: RouteContext<'/api/shares/[shareId]/events'>,
) {
  const url = new URL(request.url);

  const searchParams = SearchParams.safeParse({
    afterSeq: url.searchParams.get('afterSeq'),
  });
  if (!searchParams.success) {
    return NextResponse.json(
      {ok: false, error: 'Invalid query params'},
      {status: 400, headers: {'Cache-Control': 'no-store'}},
    );
  }

  const shareId = (await params).shareId;
  const afterSeq = searchParams.data.afterSeq;

  const events = await getEvents(shareId, afterSeq);

  return NextResponse.json(
    {ok: true, events},
    {headers: {'Cache-Control': 'no-store'}},
  );
}
