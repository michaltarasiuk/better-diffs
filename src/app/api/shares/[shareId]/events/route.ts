import {z} from 'zod';

import {getEvents} from '@/db/events';
import {touchShare} from '@/db/shares';
import {ApiError} from '@/http/error';
import {parseSearchParams, route} from '@/http/route';

const SearchParams = z.object({
  afterSeq: z.coerce.number().int().nonnegative().default(0),
});

export const GET = route(
  async (request, {params}: RouteContext<'/api/shares/[shareId]/events'>) => {
    const {shareId} = await params;
    const {afterSeq} = parseSearchParams(SearchParams, request);

    if (!(await touchShare(shareId))) {
      throw new ApiError('NOT_FOUND', `Share "${shareId}" not found.`, {
        reason: 'SHARE_NOT_FOUND',
        metadata: {shareId},
      });
    }

    const events = await getEvents(shareId, afterSeq);

    return Response.json({events});
  },
  {headers: {'Cache-Control': 'no-store'}},
);
