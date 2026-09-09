import {parsePatchFiles} from '@pierre/diffs';
import {NextResponse} from 'next/server';
import {z} from 'zod';

import {createShare} from '@/db/shares';
import {env} from '@/env';
import {Accept} from '@/headers/accept';
import {ContentType} from '@/headers/contentType';
import {isDefined} from '@/utils/defined';

import type {FileDiffMetadata} from '@pierre/diffs';
import type {NextRequest} from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
};

const Body = z.object({
  patches: z.array(z.array(z.custom<FileDiffMetadata>())),
});

type Patches = readonly (readonly FileDiffMetadata[])[];

type ReadResult =
  | {readonly ok: true; readonly patches: Patches}
  | {readonly ok: false; readonly error: string};

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  let textBody = false;
  let textResponse = false;

  const mediaType = ContentType.from(
    request.headers.get('Content-Type'),
  ).mediaType;
  if (isDefined(mediaType)) {
    textBody = mediaType.startsWith('text/');
  }

  textResponse = Accept.from(request.headers.get('Accept')).accepts(
    'text/plain',
  );

  const read = textBody
    ? await readPatchText(request)
    : await readPatchJson(request);

  if (!read.ok) {
    if (!textResponse) {
      return NextResponse.json(
        {ok: false, error: read.error},
        {status: 400, headers: CORS_HEADERS},
      );
    }

    return new NextResponse(read.error, {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const id = await createShare(read.patches);
  const url = `${env.BASE_URL}/d/${id}`;

  if (!textResponse) {
    return NextResponse.json(
      {ok: true, url},
      {status: 201, headers: CORS_HEADERS},
    );
  }

  return new NextResponse(url, {
    status: 201,
    headers: CORS_HEADERS,
  });
}

async function readPatchText(request: NextRequest): Promise<ReadResult> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return {ok: false, error: 'Invalid text body'};
  }

  let patches: Patches;
  try {
    patches = parsePatchFiles(text)
      .map((patch) => patch.files)
      .filter((files) => files.length > 0);
  } catch {
    return {ok: false, error: 'Invalid patch text'};
  }

  if (patches.length === 0) {
    return {ok: false, error: 'Invalid patches'};
  }

  return {ok: true, patches};
}

async function readPatchJson(request: NextRequest): Promise<ReadResult> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return {ok: false, error: 'Invalid JSON body'};
  }

  const body = Body.safeParse(json);
  if (!body.success || body.data.patches.length === 0) {
    return {ok: false, error: 'Invalid patches'};
  }

  return {ok: true, patches: body.data.patches};
}
