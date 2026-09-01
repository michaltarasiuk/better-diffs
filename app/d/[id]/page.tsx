import {preloadFileTree} from '@pierre/trees/ssr';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';

import {SessionContext} from '@/lib/auth/context';
import {getSession} from '@/lib/auth/server';
import {visitShare} from '@/lib/db/shares';
import {preloadDiffs} from '@/lib/diffs/preload';
import {computeDiffStats} from '@/lib/diffs/stats';
import {
  getTreeOptions,
  prepareTreeHandoff,
  sortFilesByTreeOrder,
} from '@/lib/trees/handoff';
import {parseClientHints} from '@/lib/utils/client-hints';
import {isDefined} from '@/lib/utils/defined';

import {AnnotatedFileDiff} from './_diff-file';
import {DiffSummary} from './_diff-summary';
import {DiffTree} from './_diff-tree';
import {loadDiffSearchParams} from './_search-params';

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

  const [{id}, {q: searchQuery}, {viewportHeight}] = await Promise.all([
    params,
    loadDiffSearchParams(searchParams),
    headers().then(parseClientHints),
  ]);

  const files = visitShare(id);
  if (!isDefined(files)) {
    notFound();
  }

  const metadata = files.map((f) => f.metadata);
  const stats = computeDiffStats(metadata);

  const treeHandoff = prepareTreeHandoff(metadata, {
    viewportHeight,
  });
  const treeSortedFiles = sortFilesByTreeOrder(files, treeHandoff.sortedPaths);
  const treeOptions = {
    ...getTreeOptions(treeHandoff),
    initialSearchQuery: searchQuery,
  };

  const preloadedTree = preloadFileTree(treeOptions);
  const preloadedDiffsPromise = preloadDiffs(treeSortedFiles);

  const [diffs, session] = await Promise.all([
    preloadedDiffsPromise,
    sessionPromise,
  ]);

  return (
    <div className="flex h-full">
      <aside aria-label="Files" className="w-80 shrink-0 border-e">
        <DiffTree handoff={treeHandoff} preloaded={preloadedTree}>
          <DiffSummary stats={stats} />
        </DiffTree>
      </aside>
      <main aria-label="Diff" className="min-w-0 flex-1 overflow-y-auto">
        <SessionContext value={session}>
          {diffs.map(({fileId, preloaded}) => (
            <AnnotatedFileDiff
              key={fileId}
              fileId={fileId}
              preloaded={preloaded}
            />
          ))}
        </SessionContext>
      </main>
    </div>
  );
}
