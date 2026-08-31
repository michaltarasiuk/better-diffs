import {createLoader, parseAsString} from 'nuqs/server';

export const diffSearchParsers = {
  q: parseAsString,
};

export const loadDiffSearchParams = createLoader(diffSearchParsers);
