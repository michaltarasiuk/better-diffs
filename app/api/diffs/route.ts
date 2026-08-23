import {z} from 'zod';

import {createShare} from '@/lib/db/shares';
import {env} from '@/lib/env';

import type {FileDiffMetadata} from '@pierre/diffs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const Body = z.object({
  patches: z.array(z.array(z.custom<FileDiffMetadata>()).min(1)).min(1),
});

export function OPTIONS() {
  return new Response(null, {status: 204, headers: CORS_HEADERS});
}

export async function POST(request: Request) {
  const init: ResponseInit = {status: 400, headers: CORS_HEADERS};

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ok: false, error: 'Invalid JSON body'}, init);
  }

  const body = Body.safeParse(json);
  if (!body.success) {
    return Response.json({ok: false, error: 'Invalid request body'}, init);
  }

  const id = createShare(body.data.patches);
  init.status = 201;

  return Response.json({ok: true, id, url: `${env.BASE_URL}/d/${id}`}, init);
}
