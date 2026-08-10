import {db} from '@/lib/db';
import {patches, shares} from '@/lib/db/schema';
import {env} from '@/lib/env';
import {z, safeParse} from 'zod';

const CreateShare = z.object({
  patches: z.array(z.string().min(1).max(5_000_000)).min(1),
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(
  request: Request,
  _context: RouteContext<'/api/diffs'>,
) {
  const body: unknown = await request.json().catch(() => null);

  const result = safeParse(CreateShare, body);
  if (!result.success) {
    return Response.json(
      {error: result.error.issues[0].message},
      {status: 400, headers: CORS_HEADERS},
    );
  }

  const [share] = db.insert(shares).values({}).returning({id: shares.id}).all();

  db.insert(patches)
    .values(
      result.data.patches.map((patch, i) => ({
        shareId: share.id,
        patch,
        order: i,
      })),
    )
    .run();

  const url = `${env.BASE_URL}/d/${share.id}`;

  return Response.json(
    {id: share.id, url},
    {status: 201, headers: CORS_HEADERS},
  );
}

export async function OPTIONS() {
  return new Response(null, {status: 204, headers: CORS_HEADERS});
}
