import {Spinner} from '@heroui/react';
import {preloadFileTree} from '@pierre/trees/ssr';
import {notFound} from 'next/navigation';
import {Suspense} from 'react';

import {SessionProvider} from '@/auth/SessionProvider';
import {visitShare} from '@/db/shares';
import {computeDiffStats} from '@/diffs/stats';
import {
  getTreeOptions,
  orderFilesByTree,
  prepareTreeHandoff,
} from '@/trees/handoff';
import {isDefined} from '@/utils/defined';

import {CodeViewProvider} from './CodeViewProvider';
import {DiffFiles} from './DiffFiles';
import {DiffStats} from './DiffStats';
import {FilesDrawer} from './FilesDrawer';
import {FilesPanel} from './FilesPanel';
import {loadDiffSearchParams} from './searchParams';
import {Sidebar} from './Sidebar';
import {SyncEvents} from './SyncEvents';

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
                <DiffFiles files={files} />
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
