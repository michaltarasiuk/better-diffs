import {parsePatchFiles} from '@pierre/diffs';
import dedent from 'dedent';
import {describe, expect, it} from 'vitest';

import {isDefined} from '@/utils/is-defined';
import {isEmptyDiff} from './empty';

function parseFile(patch: string) {
  const [file] = parsePatchFiles(patch).flatMap(({files}) => files);
  if (!isDefined(file)) {
    throw new Error('Patch has no files');
  }
  return file;
}

describe('isEmptyDiff', () => {
  it('returns true for a binary file', () => {
    const file = parseFile(dedent`
      diff --git a/favicon.ico b/favicon.ico
      new file mode 100644
      index 0000000..5c125de
      Binary files /dev/null and b/favicon.ico differ
    `);

    expect(isEmptyDiff(file)).toBe(true);
  });

  it('returns false for a text change', () => {
    const file = parseFile(dedent`
      diff --git a/index.js b/index.js
      new file mode 100644
      index 0000000..1111111
      --- /dev/null
      +++ b/index.js
      @@ -0,0 +1 @@
      +export {};
    `);

    expect(isEmptyDiff(file)).toBe(false);
  });
});
