import type {FileDiffMetadata} from '@pierre/diffs';

import {z} from 'zod';

import {createShare} from '@/lib/db/shares';
import {env} from '@/lib/env';

const Body = z.object({
  patches: z.array(z.array(z.custom<FileDiffMetadata>()).min(1)).min(1),
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, {status: 204, headers: CORS_HEADERS});
}

export async function POST(request: Request) {
  const body = Body.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return Response.json(
      {ok: false, error: 'Invalid JSON body'},
      {status: 400, headers: CORS_HEADERS},
    );
  }

  const id = createShare(body.data.patches);
  const url = `${env.BASE_URL}/d/${id}`;

  return Response.json(
    {ok: true, id, url},
    {status: 201, headers: CORS_HEADERS},
  );
}
