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
import {CodeViewProvider} from './_components/code-view-provider';
import {DiffFiles} from './_components/diff-files';
import {DiffStats} from './_components/diff-stats';
import {FilesDrawer} from './_components/files-drawer';
import {FilesPanel} from './_components/files-panel';
import {Sidebar} from './_components/sidebar';
import {SyncEvents} from './_components/sync-events';
import {loadDiffSearchParams} from './_lib/search-params';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/d/[shareId]'>): Promise<Metadata> {
  const {shareId} = await params;
  return {title: `Diff ${shareId}`};
}

export default async function DiffPage({
  params,
  searchParams,
}: PageProps<'/d/[shareId]'>) {
  const [{shareId}, {q: searchQuery}] = await Promise.all([
    params,
    loadDiffSearchParams(searchParams),
  ]);

  const files = await openShare(shareId);
  if (!isDefined(files)) {
    notFound();
  }

  const fileDiffs = files.map(({metadata}) => metadata);

  const tree = prepareTreeHandoff(fileDiffs);
  const stats = computeDiffStats(fileDiffs);

  const orderedFiles = orderFilesByTree(files, tree);
  const fileIdByPath = Object.fromEntries(
    files.map((file) => [file.name, file.id]),
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
