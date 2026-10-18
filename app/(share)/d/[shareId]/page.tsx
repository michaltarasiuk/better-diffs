import {Spinner} from '@heroui/react';
import {preloadFileTree} from '@pierre/trees/ssr';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Suspense} from 'react';

import {SessionProvider} from '#/auth/provider';
import {getShareFiles, touchShare} from '#/db/shares';
import {getSnapshot} from '#/db/threads';
import {computeDiffStats} from '#/diffs/stats';
import {ThreadsProvider} from '#/threads/provider';
import {prepareTreeInput, sortByTree} from '#/trees/input';
import {getFileTreeOptions} from '#/trees/options';
import {isDefined} from '#/utils/is-defined';

import {CodeViewProvider} from './_components/code-view-provider';
import {DiffView} from './_components/diff-view';
import {FileTreePanel} from './_components/file-tree-panel';
import {FilesDrawer} from './_components/files-drawer';
import {FilesSidebar} from './_components/files-sidebar';
import {ReviewStateProvider} from './_components/review-state-provider';
import {Stats} from './_components/stats';
import {loadSearchParams} from './_lib/params';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/d/[shareId]'>): Promise<Metadata> {
  const {shareId} = await params;
  return {title: `Diff ${shareId}`};
}

export default async function SharePage({
  params,
  searchParams,
}: PageProps<'/d/[shareId]'>) {
  const [{shareId}, {q: searchQuery}] = await Promise.all([
    params,
    loadSearchParams(searchParams),
  ]);

  if (!(await touchShare(shareId))) {
    notFound();
  }

  const [files, snapshot] = await Promise.all([
    getShareFiles(shareId),
    getSnapshot(shareId),
  ]);
  if (!isDefined(snapshot)) {
    notFound();
  }

  const fileDiffs = files.map(({metadata}) => metadata);

  const treeInput = prepareTreeInput(fileDiffs);
  const stats = computeDiffStats(fileDiffs);

  const sortedFiles = sortByTree(files, treeInput);
  const fileIdByPath: Record<string, string> = {};
  for (const file of files) {
    fileIdByPath[file.name] ??= file.id;
  }

  const tree = (
    <FileTreePanel
      input={treeInput}
      preloaded={preloadFileTree(getFileTreeOptions(treeInput, {searchQuery}))}
      fileIdByPath={fileIdByPath}
    >
      <Stats stats={stats} />
    </FileTreePanel>
  );

  return (
    <div className="flex h-full flex-col md:flex-row">
      <CodeViewProvider>
        <FilesSidebar>{tree}</FilesSidebar>

        <main aria-label="Diff" className="min-h-0 min-w-0 flex-1">
          <SessionProvider>
            <Suspense fallback={diffViewSpinner}>
              <ThreadsProvider
                key={shareId}
                shareId={shareId}
                snapshot={snapshot}
              >
                <ReviewStateProvider key={shareId}>
                  <DiffView files={sortedFiles} />
                </ReviewStateProvider>
              </ThreadsProvider>
            </Suspense>
          </SessionProvider>
        </main>

        <div aria-label="Files" className="md:hidden">
          <FilesDrawer>{tree}</FilesDrawer>
        </div>
      </CodeViewProvider>
    </div>
  );
}

const diffViewSpinner = (
  <div className="flex h-full items-center justify-center">
    <Spinner aria-label="Loading diff" />
  </div>
);
