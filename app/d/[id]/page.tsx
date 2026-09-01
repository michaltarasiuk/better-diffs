import {preloadFileTree} from '@pierre/trees/ssr';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {Suspense} from 'react';

import {SessionProvider} from '@/lib/auth/provider';
import {visitShare} from '@/lib/db/shares';
import {preloadDiffs, type DiffFile} from '@/lib/diffs/preload';
import {getTreeOptions} from '@/lib/trees/handoff';
import {parseClientHints} from '@/lib/utils/client-hints';
import {isDefined} from '@/lib/utils/defined';

import {AnnotatedFileDiff} from './_diff-file';
import {DiffFilesShell, diffFilesSpinner} from './_diff-files-shell';
import {DiffSummary} from './_diff-summary';
import {DiffTree} from './_diff-tree';
import {prepareDiffView} from './_diff-view';
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
  const [{id}, {q: searchQuery}, {viewportHeight}] = await Promise.all([
    params,
    loadDiffSearchParams(searchParams),
    headers().then(parseClientHints),
  ]);

  const share = visitShare(id);
  if (!isDefined(share)) {
    notFound();
  }

  const {tree, stats, files} = prepareDiffView(share, {viewportHeight});

  return (
    <div className="flex h-full">
      <aside aria-label="Files" className="w-80 shrink-0 border-e">
        <DiffTree
          handoff={tree}
          preloaded={preloadFileTree(getTreeOptions(tree, {searchQuery}))}
        >
          <DiffSummary stats={stats} />
        </DiffTree>
      </aside>
      <main aria-label="Diff" className="min-w-0 flex-1 overflow-y-auto">
        <Suspense fallback={diffFilesSpinner}>
          <SessionProvider>
            <DiffFilesShell>
              <DiffFiles files={files} />
            </DiffFilesShell>
          </SessionProvider>
        </Suspense>
      </main>
    </div>
  );
}

interface DiffFilesProps {
  readonly files: readonly DiffFile[];
}

async function DiffFiles({files}: DiffFilesProps) {
  const preloadedFiles = await preloadDiffs(files);

  return preloadedFiles.map(({fileId, preloaded}) => (
    <AnnotatedFileDiff key={fileId} fileId={fileId} preloaded={preloaded} />
  ));
}
