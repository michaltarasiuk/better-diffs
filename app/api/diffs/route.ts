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
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return respond({ok: false, error: 'Invalid JSON body'}, 400);
  }

  const body = Body.safeParse(json);
  if (!body.success) {
    return respond({ok: false, error: 'Invalid request body'}, 400);
  }

  const id = createShare(body.data.patches);

  return respond({ok: true, id, url: `${env.BASE_URL}/d/${id}`}, 201);
}

function respond(body: unknown, status: number) {
  return Response.json(body, {status, headers: CORS_HEADERS});
}
