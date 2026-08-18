import type {Metadata} from 'next';

import {preloadFileTree} from '@pierre/trees/ssr';
import {notFound} from 'next/navigation';

import {SessionContext} from '@/lib/auth/context';
import {getSession} from '@/lib/auth/server';
import {findShareWithPatches, touchShare} from '@/lib/db/shares';
import {preloadDiffs} from '@/lib/diffs/preload';
import {
  getDiffTreeOptions,
  prepareDiffTreeHandoff,
  sortFilesByTreeOrder,
} from '@/lib/diffs/tree';
import {isPresent} from '@/lib/utils/is-present';

import {DiffList} from './_diff-list';
import {DiffTree} from './_diff-tree';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/d/[id]'>): Promise<Metadata> {
  const {id} = await params;
  return {title: `Diff ${id}`};
}

export default async function Page({params}: PageProps<'/d/[id]'>) {
  const {id} = await params;

  const share = findShareWithPatches(id);
  if (!isPresent(share)) {
    notFound();
  }
  touchShare(id);

  const files = share.patches.flatMap((patch) => patch.files);

  const treeHandoff = prepareDiffTreeHandoff(files);
  const sortedFiles = sortFilesByTreeOrder(files, treeHandoff.sortedPaths);
  const treeOptions = getDiffTreeOptions(treeHandoff);

  const [items, session] = await Promise.all([
    preloadDiffs(sortedFiles),
    getSession(),
  ]);
  const preloadedData = preloadFileTree(treeOptions);

  return (
    <SessionContext value={session}>
      <div className="flex h-dvh">
        <aside className="w-80 shrink-0 border-e">
          <DiffTree handoff={treeHandoff} preloadedData={preloadedData} />
        </aside>
        <main className="min-w-0 flex-1">
          <DiffList items={items} />
        </main>
      </div>
    </SessionContext>
  );
}
