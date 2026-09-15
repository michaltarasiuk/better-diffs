import {createLoader, createParser, parseAsJson} from 'nuqs/server';

import {SelectedLines} from '@/diffs/schemas';

const parseAsSearchQuery = createParser({
  parse: (value) => (value === '' ? null : value),
  serialize: String,
});

export const diffSearchParsers = {
  q: parseAsSearchQuery,
  lines: parseAsJson(SelectedLines),
};

export const loadDiffSearchParams = createLoader(diffSearchParsers);
