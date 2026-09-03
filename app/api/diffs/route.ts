import {parsePatchFiles} from '@pierre/diffs';
import {z} from 'zod';

import {createShare} from '@/lib/db/shares';
import {env} from '@/lib/env';

import type {FileDiffMetadata} from '@pierre/diffs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
};

const Body = z.object({
  patches: z.array(z.array(z.custom<FileDiffMetadata>()).min(1)).min(1),
});

type Patches = readonly (readonly FileDiffMetadata[])[];

type ReadResult =
  | {readonly ok: true; readonly patches: Patches}
  | {readonly ok: false; readonly error: string};

export function OPTIONS() {
  return new Response(null, {status: 204, headers: CORS_HEADERS});
}

export async function POST(request: Request) {
  const asPlainText =
    request.headers.get('Accept')?.includes('text/plain') === true;

  const read = request.headers.get('Content-Type')?.startsWith('text/')
    ? await readPatchText(request)
    : await readPatchJson(request);

  if (!read.ok) {
    return asPlainText
      ? textResponse(read.error, 400)
      : Response.json(
          {ok: false, error: read.error},
          {status: 400, headers: CORS_HEADERS},
        );
  }

  const id = await createShare(read.patches);
  const url = `${env.BASE_URL}/d/${id}`;

  return asPlainText
    ? textResponse(url, 201)
    : Response.json({ok: true, id, url}, {status: 201, headers: CORS_HEADERS});
}

async function readPatchText(request: Request): Promise<ReadResult> {
  const patch = await request.text();

  let patches: Patches;
  try {
    patches = parsePatchFiles(patch)
      .map((parsed) => parsed.files)
      .filter((files) => files.length > 0);
  } catch {
    return {ok: false, error: 'Invalid patch'};
  }

  if (patches.length === 0) {
    return {ok: false, error: 'No diffs found in patch'};
  }

  return {ok: true, patches};
}

async function readPatchJson(request: Request): Promise<ReadResult> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return {ok: false, error: 'Invalid JSON body'};
  }

  const body = Body.safeParse(json);
  if (!body.success) {
    return {ok: false, error: 'Invalid request body'};
  }

  return {ok: true, patches: body.data.patches};
}

function textResponse(body: string, status: number) {
  return new Response(`${body}\n`, {
    status,
    headers: {...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8'},
  });
}
