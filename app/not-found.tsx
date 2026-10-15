import '#/diffs/diffs.css';

import {MultiFileDiff} from '@pierre/diffs/react';

import {fileContents} from '#/diffs/contents';
import {PATCH_DIFF_OPTIONS} from '#/diffs/options';

const NOT_FOUND_OLD_FILE = fileContents(
  'share/link',
  '404 Not Found',
  'diff share not found or expired',
  'better-diffs --open',
);
const NOT_FOUND_NEW_FILE = fileContents('share/link');

export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <MultiFileDiff
          oldFile={NOT_FOUND_OLD_FILE}
          newFile={NOT_FOUND_NEW_FILE}
          options={PATCH_DIFF_OPTIONS}
          className="w-full"
        />
      </div>
    </main>
  );
}
