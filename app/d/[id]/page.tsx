import {Spinner} from '@heroui/react';
import {preloadFileTree} from '@pierre/trees/ssr';
import {notFound} from 'next/navigation';

import {SessionProvider} from '@/lib/auth/provider';
import {visitShare} from '@/lib/db/shares';
import {computeDiffStats} from '@/lib/diffs/stats';
import {
  getTreeOptions,
  orderFilesByTree,
  prepareTreeHandoff,
} from '@/lib/trees/handoff';
import {ClientGate} from '@/lib/utils/client-gate';
import {loadClientHints} from '@/lib/utils/client-hints';
import {isDefined} from '@/lib/utils/defined';

import {loadDiffSearchParams} from './_lib/search-params';
import {DiffTree} from './_sidebar/file-tree';
import {ResizableSidebar} from './_sidebar/resizable-sidebar';
import {DiffSummary} from './_sidebar/summary';
import {DiffCodeView} from './_viewer/code-view';
import {DiffViewerProvider} from './_viewer/context';

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
    loadClientHints(),
  ]);

  const share = await visitShare(id);
  if (!isDefined(share)) {
    notFound();
  }

  const fileDiffs = share.map(({metadata}) => metadata);

  const tree = prepareTreeHandoff(fileDiffs, {viewportHeight});
  const stats = computeDiffStats(fileDiffs);

  const files = orderFilesByTree(share, tree);
  const fileIdByPath = Object.fromEntries(
    files.map(({id, name}) => [name, id]),
  );

  return (
    <div className="flex h-full">
      <DiffViewerProvider>
        <ResizableSidebar aria-label="Files" className="hidden md:block">
          <DiffTree
            handoff={tree}
            preloaded={preloadFileTree(getTreeOptions(tree, {searchQuery}))}
            fileIdByPath={fileIdByPath}
          >
            <DiffSummary stats={stats} />
          </DiffTree>
        </ResizableSidebar>
        <main aria-label="Diff" className="min-h-0 min-w-0 flex-1">
          <SessionProvider>
            <ClientGate fallback={diffFilesSpinner}>
              <DiffCodeView files={files} />
            </ClientGate>
          </SessionProvider>
        </main>
      </DiffViewerProvider>
    </div>
  );
}

const diffFilesSpinner = (
  <div className="flex h-full items-center justify-center">
    <Spinner aria-label="Loading diff" />
  </div>
);
