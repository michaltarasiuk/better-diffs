import {type FileDiffMetadata, parsePatchFiles} from '@pierre/diffs';

import {createShare} from '@/db/shares';
import {env} from '@/env';
import {ApiError} from '@/http/error';
import {prefersText, route} from '@/http/route';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Expose-Headers': 'Location',
};

type Patches = readonly (readonly FileDiffMetadata[])[];

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export const POST = route(
  async (request) => {
    const text = await request.text();
    const id = await createShare(text, parsePatchText(text));
    const url = `${env.BASE_URL}/d/${id}`;
    const headers = {Location: url};

    if (prefersText(request)) {
      return new Response(url, {status: 201, headers});
    }
    return Response.json({name: `shares/${id}`, url}, {status: 201, headers});
  },
  {headers: CORS_HEADERS},
);

function parsePatchText(text: string): Patches {
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
