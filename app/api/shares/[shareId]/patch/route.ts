import {getSharePatch, touchShare} from '@/db/shares';
import {ApiError} from '@/http/error';
import {route} from '@/http/route';
import {isDefined} from '@/utils/is-defined';

export const GET = route(
  async (_request, {params}: RouteContext<'/api/shares/[shareId]/patch'>) => {
    const {shareId} = await params;
    const patch = await getSharePatch(shareId);

    if (!isDefined(patch)) {
      throw new ApiError('NOT_FOUND', `Share "${shareId}" not found.`, {
        reason: 'SHARE_NOT_FOUND',
        metadata: {shareId},
      });
    }

    await touchShare(shareId);

    return new Response(patch, {
      headers: {
        'Content-Type': 'text/x-diff; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
  {headers: {'Cache-Control': 'no-store'}},
);
