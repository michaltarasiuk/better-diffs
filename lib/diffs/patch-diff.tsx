import {PatchDiff} from '@pierre/diffs/react';

import {DiffWorkerPoolProvider} from './worker-pool';

import type {PatchDiffProps} from '@pierre/diffs/react';

export function PatchDiffSurface<T>(props: PatchDiffProps<T>) {
  return (
    <DiffWorkerPoolProvider>
      <PatchDiff {...props} />
    </DiffWorkerPoolProvider>
  );
}
