import {createLoader, parseAsJson, parseAsString} from 'nuqs/server';

import {SelectedLines} from '@/diffs/schemas';

export const diffSearchParsers = {
  q: parseAsString,
  lines: parseAsJson(SelectedLines),
};

export const loadDiffSearchParams = createLoader(diffSearchParsers);
