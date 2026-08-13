import type {Metadata} from 'next';

import {notFound} from 'next/navigation';

import {findShareWithPatches, touchShare} from '@/lib/db/shares';
import {preloadShareDiffs} from '@/lib/diffs/preload';
import {isDefined} from '@/lib/utils/is-defined';

import {DiffList} from './_diff-list';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/d/[id]'>): Promise<Metadata> {
  const {id} = await params;
  return {title: `Diff ${id}`};
}

export default async function Page({params}: PageProps<'/d/[id]'>) {
  const {id} = await params;

  const share = findShareWithPatches(id);
  if (!isDefined(share)) {
    notFound();
  }

  touchShare(id);
  const items = await preloadShareDiffs(share.patches);

  return <DiffList items={items} />;
}
