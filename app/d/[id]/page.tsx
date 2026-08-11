export const dynamic = 'force-dynamic';

import type {Metadata} from 'next';

import {asc, eq, sql} from 'drizzle-orm';
import {notFound} from 'next/navigation';

import {db} from '@/lib/db';
import {patches, shares} from '@/lib/db/schema';
import {isDefined} from '@/lib/is-defined';

import {DiffPage} from './diff-page';

export async function generateMetadata({
  params,
}: PageProps<'/d/[id]'>): Promise<Metadata> {
  const {id} = await params;
  return {title: `Diff ${id}`};
}

export default async function Page({params}: PageProps<'/d/[id]'>) {
  const {id} = await params;

  const share = db.query.shares
    .findFirst({
      where: eq(shares.id, id),
    })
    .sync();

  if (!isDefined(share)) {
    notFound();
  }

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

  const items = sharePatches.flatMap((p) =>
    p.files.map((fileDiff) => ({
      id: fileDiff.name,
      type: 'diff' as const,
      fileDiff,
    })),
  );

  return <DiffPage items={items} />;
}
