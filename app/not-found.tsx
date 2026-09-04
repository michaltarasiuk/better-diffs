import '@/lib/diffs/diffs.css';

import dedent from 'dedent';

import {PATCH_DIFF_OPTIONS} from '@/lib/diffs/options';
import {PatchDiffSurface} from '@/lib/diffs/patch-diff';

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

export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <PatchDiffSurface
          patch={NOT_FOUND_PATCH}
          options={PATCH_DIFF_OPTIONS}
          className="w-full"
        />
      </div>
    </main>
  );
}
