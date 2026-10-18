import {createHmac} from 'node:crypto';

import {parsePatchFiles} from '@pierre/diffs';

import {createShare} from '#/db/shares';
import type {Patch} from '#/diffs/schemas';
import {env} from '#/env';
import {ApiError} from '#/http/error';
import {prefersText, route} from '#/http/route';
import {isDefined} from '#/utils/is-defined';

const MAX_PATCH_BYTES = 2 * 1024 * 1024;
const MAX_UPLOADS_PER_HOUR = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Expose-Headers': 'Location',
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export const POST = route(
  async (request) => {
    const patchesText = await readPatchesText(request);
    const patches = parsePatches(patchesText);
    const id = await createShare(
      patchesText,
      patches,
      getUploaderKey(request),
      checkUploadRate,
    );
    const url = `${env.BASE_URL}/d/${id}`;
    const headers = {Location: url};

    if (prefersText(request)) {
      return new Response(url, {status: 201, headers});
    }
    return Response.json({name: `shares/${id}`, url}, {status: 201, headers});
  },
  {headers: CORS_HEADERS},
);

function getUploaderKey(request: Request) {
  const ip = request.headers.get('x-real-ip');
  if (!isDefined(ip)) {
    return undefined;
  }
  return createHmac('sha256', env.BETTER_AUTH_SECRET)
    .update(`uploader:${ip}`)
    .digest('base64url');
}

function checkUploadRate(uploadsInLastHour: number) {
  if (uploadsInLastHour >= MAX_UPLOADS_PER_HOUR) {
    throw new ApiError(
      'RESOURCE_EXHAUSTED',
      `Upload limit reached: ${MAX_UPLOADS_PER_HOUR} diffs an hour. Try again later.`,
      {reason: 'RATE_LIMITED'},
    );
  }
}

async function readPatchesText(request: Request) {
  const contentLength = Number(request.headers.get('Content-Length'));
  if (contentLength > MAX_PATCH_BYTES) {
    throw patchTooLarge();
  }

  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_PATCH_BYTES) {
    throw patchTooLarge();
  }
  return text;
}

function patchTooLarge() {
  return new ApiError(
    'INVALID_ARGUMENT',
    `Patch text is larger than ${MAX_PATCH_BYTES / 1024 / 1024} MiB.`,
    {reason: 'PATCH_TOO_LARGE', metadata: {maxBytes: String(MAX_PATCH_BYTES)}},
  );
}

function parsePatches(text: string) {
  let patches: readonly Patch[];
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
