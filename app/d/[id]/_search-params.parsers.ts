import {parseAsJson, parseAsString} from 'nuqs/server';

import {FormLocationsSchema} from '@/lib/diffs/annotation';

export const parseAsFormLocations = parseAsJson(
  FormLocationsSchema,
).withDefault([]);

export const diffSearchParsers = {
  q: parseAsString,
  draft: parseAsFormLocations,
};
