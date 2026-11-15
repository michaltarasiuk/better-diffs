import '#/diffs/diffs.css';

import {MultiFileDiff} from '@pierre/diffs/react';
import {fbs} from 'fbtee';

import {fileContents} from '#/diffs/contents';
import {PATCH_DIFF_OPTIONS} from '#/diffs/options';

const NOT_FOUND_NEW_FILE = fileContents('share/link');

export default function NotFoundPage() {
  const notFoundOldFile = fileContents(
    'share/link',
    fbs(
      '404 Not Found',
      'First line of the removed file on the not found page',
    ),
    fbs(
      'diff share not found or expired',
      'Line on the not found page explaining that the share link is gone',
    ),
    'better-diffs --open',
  );

  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <MultiFileDiff
          oldFile={notFoundOldFile}
          newFile={NOT_FOUND_NEW_FILE}
          options={PATCH_DIFF_OPTIONS}
          className="w-full"
        />
      </div>
    </main>
  );
}
