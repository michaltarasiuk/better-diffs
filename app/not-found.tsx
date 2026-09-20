import '@/diffs/diffs.css';

import {PatchDiff} from '@pierre/diffs/react';

import {PATCH_DIFF_OPTIONS} from '@/diffs/options';
import {NOT_FOUND_PATCH} from './_lib/patches';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <PatchDiff
          patch={NOT_FOUND_PATCH}
          options={PATCH_DIFF_OPTIONS}
          className="w-full"
        />
      </div>
    </main>
  );
}
