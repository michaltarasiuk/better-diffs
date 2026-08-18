import {createLoader, parseAsString} from 'nuqs/server';

export const diffTreeSearchParsers = {
  q: parseAsString,
};

export const loadDiffTreeSearchParams = createLoader(diffTreeSearchParsers);
