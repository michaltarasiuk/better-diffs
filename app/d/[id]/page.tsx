import {preloadFileTree} from '@pierre/trees/ssr';
import {notFound} from 'next/navigation';

import {SessionContext} from '@/lib/auth/context';
import {getSession} from '@/lib/auth/server';
import {findShareWithPatches, touchShare} from '@/lib/db/shares';
import {preloadDiffs} from '@/lib/diffs/preload';
import {computeDiffStats} from '@/lib/diffs/stats';
import {
  getTreeOptions,
  prepareTreeHandoff,
  sortFilesByTreeOrder,
} from '@/lib/trees/handoff';
import {isDefined} from '@/lib/utils/defined';

import {DiffList} from './_diff-list';
import {DiffSummary} from './_diff-summary';
import {DiffTree} from './_diff-tree';
import {loadDiffSearchParams} from './_search-params';

import type {FileTreeOptions} from '@pierre/trees';
import type {Metadata} from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/d/[id]'>): Promise<Metadata> {
  const {id} = await params;
  return {title: `Diff ${id}`};
}

export default async function DiffPage({
  params,
  searchParams,
}: PageProps<'/d/[id]'>) {
  const sessionPromise = getSession();

  const [{id}, {q: searchQuery, draft: formLocations}] = await Promise.all([
    params,
    loadDiffSearchParams(searchParams),
  ]);

  const share = findShareWithPatches(id);
  if (!isDefined(share)) {
    notFound();
  }
  touchShare(id);

  const files = share.patches.flatMap((p) => p.files);
  const stats = computeDiffStats(files);

  const treeHandoff = prepareTreeHandoff(files);
  const treeSortedFiles = sortFilesByTreeOrder(files, treeHandoff.sortedPaths);
  const treeOptions: FileTreeOptions = {
    ...getTreeOptions(treeHandoff),
    initialSearchQuery: searchQuery,
  };

  const preloadedTree = preloadFileTree(treeOptions);
  const preloadedDiffsPromise = preloadDiffs(treeSortedFiles, formLocations);

  const [diffs, session] = await Promise.all([
    preloadedDiffsPromise,
    sessionPromise,
  ]);

  return (
    <div className="flex h-dvh">
      <aside aria-label="Files" className="w-80 shrink-0 border-e">
        <DiffTree handoff={treeHandoff} preloadedData={preloadedTree}>
          <DiffSummary stats={stats} />
        </DiffTree>
      </aside>
      <main aria-label="Diff" className="min-w-0 flex-1">
        <SessionContext value={session}>
          <DiffList items={diffs} />
        </SessionContext>
      </main>
    </div>
  );
}
