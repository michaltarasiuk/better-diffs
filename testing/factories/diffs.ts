import dedent from 'dedent';

import type {ThreadState} from '@/events/share-state';
import {createAnchor} from '@/testing/factories/events';
import {CREATED_AT, THREAD_ID, USER_ID} from '@/testing/ids';

export const SAMPLE_UNIFIED_DIFF = dedent`
  diff --git a/file.txt b/file.txt
  index 0000001..0000002 100644
  --- a/file.txt
  +++ b/file.txt
  @@ -1,2 +1,2 @@
  -old line
  +new line
   context
`;

export function createThreadState(overrides: Partial<ThreadState> = {}) {
  return {
    id: THREAD_ID,
    anchor: createAnchor({line: 5}),
    actorId: USER_ID,
    resolved: false,
    commentIds: [],
    createdAt: CREATED_AT,
    ...overrides,
  } satisfies ThreadState;
}
