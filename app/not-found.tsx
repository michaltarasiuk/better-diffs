import '@/lib/diffs/diffs.module.css';

import {PatchDiff} from '@pierre/diffs/react';
import dedent from 'dedent';

import {DIFF_VIEWER_OPTIONS} from '@/lib/diffs/options';

const NOT_FOUND_PATCH = dedent`
  diff --git a/share/link b/share/link
  deleted file mode 100644
  --- a/share/link
  +++ /dev/null
  @@ -1,3 +0,0 @@
  -404 Not Found
  -diff share not found or expired
  -better-diffs --open
`;

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <PatchDiff
          patch={NOT_FOUND_PATCH}
          options={DIFF_VIEWER_OPTIONS}
          className="w-full"
        />
      </div>
    </main>
  );
}
