import {z} from 'zod';

import {touchShare} from '#/db/shares';
import {getSnapshot} from '#/db/threads';
import {ApiError} from '#/http/error';
import {parseSearchParams, route} from '#/http/route';

const SearchParams = z.object({
  afterRevision: z.coerce.number().int().nonnegative().optional(),
});

export const GET = route(
  async (request, {params}: RouteContext<'/api/shares/[shareId]/threads'>) => {
    const {shareId} = await params;
    const {afterRevision} = parseSearchParams(SearchParams, request);

    if (!(await touchShare(shareId))) {
      throw new ApiError('NOT_FOUND', `Share "${shareId}" not found.`, {
        reason: 'SHARE_NOT_FOUND',
        metadata: {shareId},
      });
    }

    const snapshot = await getSnapshot(shareId, afterRevision);

    return Response.json({snapshot: snapshot ?? null});
  },
  {headers: {'Cache-Control': 'no-store'}},
);
