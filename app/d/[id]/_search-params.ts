import {createLoader, parseAsString} from 'nuqs/server';

import {parseAsFormLocations} from '@/lib/diffs/annotation';

export const diffSearchParsers = {
  q: parseAsString,
  formLocations: parseAsFormLocations,
};

export const loadDiffSearchParams = createLoader(diffSearchParsers);
