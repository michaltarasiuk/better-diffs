import {createLoader, parseAsString} from 'nuqs/server';

import {parseAsFormAnnotations} from '@/lib/diffs/annotation';

export const diffSearchParsers = {
  q: parseAsString,
  formAnnotations: parseAsFormAnnotations,
};

export const loadDiffSearchParams = createLoader(diffSearchParsers);
