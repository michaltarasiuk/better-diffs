import {type FileDiffMetadata, parsePatchFiles} from '@pierre/diffs';
import {z} from 'zod';

import {ApiError} from '@/api/error';
import {parse, prefersText, readJson, route} from '@/api/route';
import {createShare} from '@/db/shares';
import {env} from '@/env';
import {ContentType} from '@/headers/content-type';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Expose-Headers': 'Location',
};

const Body = z.object({
  patches: z.array(z.array(z.custom<FileDiffMetadata>())).min(1),
});

type Patches = readonly (readonly FileDiffMetadata[])[];

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export const POST = route(
  async (request) => {
    const mediaType = ContentType.from(
      request.headers.get('Content-Type'),
    ).mediaType;

    const patches = mediaType?.startsWith('text/')
      ? await readPatchText(request)
      : await readPatchJson(request);

    const id = await createShare(patches);
    const url = `${env.BASE_URL}/d/${id}`;
    const headers = {Location: url};

    if (prefersText(request)) {
      return new Response(url, {status: 201, headers});
    }
    return Response.json({name: `shares/${id}`, url}, {status: 201, headers});
  },
  {headers: CORS_HEADERS},
);

async function readPatchText(request: Request): Promise<Patches> {
  const text = await request.text();

  let patches: Patches;
  try {
    patches = parsePatchFiles(text)
      .map((patch) => patch.files)
      .filter((files) => files.length > 0);
  } catch {
    throw new ApiError('INVALID_ARGUMENT', 'Patch text could not be parsed.', {
      reason: 'INVALID_PATCH',
    });
  }

  if (patches.length === 0) {
    throw new ApiError('INVALID_ARGUMENT', 'Patch text has no file changes.', {
      reason: 'EMPTY_PATCH',
    });
  }

  return patches;
}

async function readPatchJson(request: Request): Promise<Patches> {
  return parse(Body, await readJson(request)).patches;
}
