import type {FileDiffMetadata} from '@pierre/diffs';

import {z} from 'zod';

import {db} from '@/lib/db';
import {patches, shares} from '@/lib/db/schema';
import {env} from '@/lib/env';

const CreateShare = z.object({
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
  const body: unknown = await request.json().catch(() => null);

  const result = CreateShare.safeParse(body);
  if (!result.success) {
    return Response.json(
      {ok: false, error: 'Invalid JSON body'},
      {status: 400, headers: CORS_HEADERS},
    );
  }

  const shareId = db.transaction((tx) => {
    const [{id}] = tx
      .insert(shares)
      .values({})
      .returning({
        id: shares.id,
      })
      .all();

    tx.insert(patches)
      .values(
        result.data.patches.map((files, i) => ({
          shareId: id,
          files,
          order: i,
        })),
      )
      .run();

    return id;
  });

  const url = `${env.BASE_URL}/d/${shareId}`;

  return Response.json(
    {ok: true, id: shareId, url},
    {status: 201, headers: CORS_HEADERS},
  );
}
