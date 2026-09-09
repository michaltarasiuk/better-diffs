import {Spinner} from '@heroui/react';
import {preloadFileTree} from '@pierre/trees/ssr';
import {notFound} from 'next/navigation';
import {Suspense} from 'react';

import {SessionProvider} from '@/lib/auth/provider';
import {visitShare} from '@/lib/db/shares';
import {computeDiffStats} from '@/lib/diffs/stats';
import {
  getTreeOptions,
  orderFilesByTree,
  prepareTreeHandoff,
} from '@/lib/trees/handoff';
import {isDefined} from '@/lib/utils/defined';

import {DiffReview} from './_components/review/review';
import {ResizableSidebar} from './_components/sidebar/resizable';
import {SidebarSheet} from './_components/sidebar/sheet';
import {DiffSummary} from './_components/sidebar/summary';
import {DiffTree} from './_components/sidebar/tree';
import {EventSync} from './_lib/event-sync';
import {DiffHandleProvider} from './_lib/handle-context';
import {loadDiffSearchParams} from './_lib/search-params';

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
      preloaded={preloadFileTree(
        getTreeOptions(tree, {
          searchQuery,
        }),
      )}
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
            <Suspense fallback={diffFilesSpinner}>
              <EventSync>
                <DiffReview files={files} />
              </EventSync>
            </Suspense>
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
