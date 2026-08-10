import {notFound} from 'next/navigation';
import {eq, sql, asc} from 'drizzle-orm';
import {parsePatchFiles} from '@pierre/diffs';
import {db} from '@/lib/db';
import {shares, patches} from '@/lib/db/schema';
import {DiffPage} from './diff-page';

export default async function Page({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;

  const share = db.query.shares
    .findFirst({
      where: eq(shares.id, id),
    })
    .sync();

  if (!share) notFound();

  db.update(shares)
    .set({lastVisitedAt: sql`datetime('now')`})
    .where(eq(shares.id, id))
    .run();

  const sharePatches = db.query.patches
    .findMany({
      where: eq(patches.shareId, id),
      orderBy: asc(patches.order),
    })
    .sync();

  const files = sharePatches
    .flatMap((p) => parsePatchFiles(p.patch))
    .flatMap((p) => p.files);

  const items = files.map((fileDiff) => ({
    id: fileDiff.name,
    type: 'diff' as const,
    fileDiff,
  }));

  return <DiffPage items={items} />;
}
