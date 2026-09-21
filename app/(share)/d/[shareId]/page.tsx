import {Suspense} from 'react';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Spinner} from '@heroui/react';
import {preloadFileTree} from '@pierre/trees/ssr';

import {isDefined} from '@/utils/is-defined';
import {SessionProvider} from '@/auth/provider';
import {openShare} from '@/db/shares';
import {computeDiffStats} from '@/diffs/stats';
import {
  getTreeOptions,
  orderFilesByTree,
  prepareTreeHandoff,
} from '@/trees/handoff';
import {CodeView} from './_components/code-view';
import {Drawer} from './_components/drawer';
import {SyncEvents} from './_components/events';
import {CodeViewProvider} from './_components/provider';
import {Sidebar} from './_components/sidebar';
import {Stats} from './_components/stats';
import {Tree} from './_components/tree';
import {loadParams} from './_lib/params';

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
    loadParams(searchParams),
  ]);

  const files = await openShare(shareId);
  if (!isDefined(files)) {
    notFound();
  }

  const fileDiffs = files.map(({metadata}) => metadata);

  const treeHandoff = prepareTreeHandoff(fileDiffs);
  const stats = computeDiffStats(fileDiffs);

  const orderedFiles = orderFilesByTree(files, treeHandoff);
  const fileIdByPath = Object.fromEntries(
    files.map((file) => [file.name, file.id]),
  );

  const filesPanel = (
    <Tree
      handoff={treeHandoff}
      preloaded={preloadFileTree(
        getTreeOptions(treeHandoff, {
          searchQuery,
        }),
      )}
      fileIdByPath={fileIdByPath}
    >
      <Stats stats={stats} />
    </Tree>
  );

  return (
    <div className="flex h-full">
      <CodeViewProvider>
        <Sidebar>{filesPanel}</Sidebar>

        <main aria-label="Diff" className="min-h-0 min-w-0 flex-1">
          <SessionProvider>
            <Suspense fallback={codeViewSpinner}>
              <SyncEvents>
                <CodeView files={orderedFiles} />
              </SyncEvents>
            </Suspense>
          </SessionProvider>
        </main>

        <div aria-label="Files" className="md:hidden">
          <Drawer>{filesPanel}</Drawer>
        </div>
      </CodeViewProvider>
    </div>
  );
}

const codeViewSpinner = (
  <div className="flex h-full items-center justify-center">
    <Spinner aria-label="Loading diff" />
  </div>
);
