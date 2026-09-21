import {createLoader, createParser, parseAsJson} from 'nuqs/server';

import {SelectedLines} from '@/diffs/schemas';

const parseAsSearchQuery = createParser({
  parse: (value) => (value === '' ? null : value),
  serialize: String,
});

export const searchParsers = {
  q: parseAsSearchQuery,
  lines: parseAsJson(SelectedLines),
};

export const loadParams = createLoader(searchParsers);
