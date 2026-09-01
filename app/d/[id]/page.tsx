import {preloadFileTree} from '@pierre/trees/ssr';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';

import {SessionProvider} from '@/lib/auth/provider';
import {visitShare} from '@/lib/db/shares';
import {getTreeOptions} from '@/lib/trees/handoff';
import {parseClientHints} from '@/lib/utils/client-hints';
import {isDefined} from '@/lib/utils/defined';

import {DiffCodeView} from './_diff-code-view';
import {DiffFilesShell} from './_diff-files-shell';
import {DiffSummary} from './_diff-summary';
import {DiffTree} from './_diff-tree';
import {prepareDiffView} from './_diff-view';
import {DiffViewerProvider} from './_diff-viewer-context';
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

  const {tree, stats, files, fileIdsByPath} = prepareDiffView(share, {
    viewportHeight,
  });

  return (
    <DiffViewerProvider>
      <div className="flex h-full">
        <aside aria-label="Files" className="w-80 shrink-0 border-e">
          <DiffTree
            handoff={tree}
            preloaded={preloadFileTree(getTreeOptions(tree, {searchQuery}))}
            fileIdsByPath={fileIdsByPath}
          >
            <DiffSummary stats={stats} />
          </DiffTree>
        </aside>
        <main aria-label="Diff" className="min-h-0 min-w-0 flex-1">
          <SessionProvider>
            <DiffFilesShell>
              <DiffCodeView files={files} />
            </DiffFilesShell>
          </SessionProvider>
        </main>
      </div>
    </DiffViewerProvider>
  );
}
