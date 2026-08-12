import type {Metadata} from 'next';

import {preloadFileDiff} from '@pierre/diffs/ssr';
import {asc, eq, sql} from 'drizzle-orm';
import {notFound} from 'next/navigation';

import type {PreloadedDiffItem} from '@/lib/diffs';

import {db} from '@/lib/db';
import {patches, shares} from '@/lib/db/schema';
import {DIFF_VIEWER_OPTIONS} from '@/lib/diffs';
import {isDefined} from '@/lib/is-defined';

import {DiffList} from './_diff-list';

export const dynamic = 'force-dynamic';

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
      with: {
        patches: {
          orderBy: asc(patches.order),
        },
      },
    })
    .sync();

  if (!isDefined(share)) {
    notFound();
  }

  db.update(shares)
    .set({lastVisitedAt: sql`datetime('now')`})
    .where(eq(shares.id, id))
    .run();

  const items = await Promise.all(
    share.patches.flatMap((patch) =>
      patch.files.map(async (fileDiff) => {
        const preloaded = await preloadFileDiff({
          fileDiff,
          options: DIFF_VIEWER_OPTIONS,
        });
        return {
          id: preloaded.fileDiff.name,
          fileDiff: preloaded.fileDiff,
          prerenderedHTML: preloaded.prerenderedHTML,
        } satisfies PreloadedDiffItem;
      }),
    ),
  );

  return <DiffList items={items} />;
}
