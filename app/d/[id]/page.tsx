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
import {ClientOnly} from '@/lib/utils/client-only';
import {isDefined} from '@/lib/utils/defined';

import {DiffHandleProvider} from './_lib/handle-context';
import {loadDiffSearchParams} from './_lib/search-params';
import {DiffReview} from './_review/review';
import {ResizableSidebar} from './_sidebar/resizable-sidebar';
import {SidebarSheet} from './_sidebar/sidebar-sheet';
import {DiffSummary} from './_sidebar/summary';
import {DiffTree} from './_sidebar/tree';

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
  const [{id}, {q: searchQuery}] = await Promise.all([
    params,
    loadDiffSearchParams(searchParams),
  ]);

  const share = await visitShare(id);
  if (!isDefined(share)) {
    notFound();
  }

  const fileDiffs = share.map(({metadata}) => metadata);

  const tree = prepareTreeHandoff(fileDiffs);
  const stats = computeDiffStats(fileDiffs);

  const files = orderFilesByTree(share, tree);
  const fileIdByPath = Object.fromEntries(
    files.map(({id, name}) => [name, id]),
  );

  const diffTreeNode = (
    <DiffTree
      handoff={tree}
      preloaded={preloadFileTree(getTreeOptions(tree, {searchQuery}))}
      fileIdByPath={fileIdByPath}
    >
      <DiffSummary stats={stats} />
    </DiffTree>
  );

  return (
    <div className="flex h-full">
      <DiffHandleProvider>
        <ResizableSidebar aria-label="Files" className="hidden md:block">
          {diffTreeNode}
        </ResizableSidebar>
        <main aria-label="Diff" className="min-h-0 min-w-0 flex-1">
          <SessionProvider>
            <ClientOnly fallback={diffFilesSpinner}>
              <DiffReview files={files} />
            </ClientOnly>
          </SessionProvider>
        </main>
        <div aria-label="Files" className="md:hidden">
          <SidebarSheet>{diffTreeNode}</SidebarSheet>
        </div>
      </DiffHandleProvider>
    </div>
  );
}

const diffFilesSpinner = (
  <div className="flex h-full items-center justify-center">
    <Spinner aria-label="Loading diff" />
  </div>
);
