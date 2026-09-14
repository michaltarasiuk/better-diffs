import {Suspense} from 'react';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Spinner} from '@heroui/react';
import {preloadFileTree} from '@pierre/trees/ssr';

import {isDefined} from '@/utils/defined';
import {SessionProvider} from '@/auth/session-provider';
import {openShare} from '@/db/shares';
import {computeDiffStats} from '@/diffs/stats';
import {
  getTreeOptions,
  orderFilesByTree,
  prepareTreeHandoff,
} from '@/trees/handoff';
import {CodeViewProvider} from './code-view-provider';
import {DiffFiles} from './diff-files';
import {DiffStats} from './diff-stats';
import {FilesDrawer} from './files-drawer';
import {FilesPanel} from './files-panel';
import {loadDiffSearchParams} from './search-params';
import {Sidebar} from './sidebar';
import {SyncEvents} from './sync-events';

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

  const files = await openShare(id);
  if (!isDefined(files)) {
    notFound();
  }

  const fileDiffs = files.map(({metadata}) => metadata);

  const tree = prepareTreeHandoff(fileDiffs);
  const stats = computeDiffStats(fileDiffs);

  const orderedFiles = orderFilesByTree(files, tree);
  const fileIdByPath = Object.fromEntries(
    files.map(({id, name}) => [name, id]),
  );

  const filesPanel = (
    <FilesPanel
      handoff={tree}
      preloaded={preloadFileTree(
        getTreeOptions(tree, {
          searchQuery,
        }),
      )}
      fileIdByPath={fileIdByPath}
    >
      <DiffStats stats={stats} />
    </FilesPanel>
  );

  return (
    <div className="flex h-full">
      <CodeViewProvider>
        <Sidebar>{filesPanel}</Sidebar>

        <main aria-label="Diff" className="min-h-0 min-w-0 flex-1">
          <SessionProvider>
            <Suspense fallback={diffFilesSpinner}>
              <SyncEvents>
                <DiffFiles files={orderedFiles} />
              </SyncEvents>
            </Suspense>
          </SessionProvider>
        </main>

        <div aria-label="Files" className="md:hidden">
          <FilesDrawer>{filesPanel}</FilesDrawer>
        </div>
      </CodeViewProvider>
    </div>
  );
}

const diffFilesSpinner = (
  <div className="flex h-full items-center justify-center">
    <Spinner aria-label="Loading diff" />
  </div>
);
