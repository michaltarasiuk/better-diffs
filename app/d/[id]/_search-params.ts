import 'server-only';

import {createLoader} from 'nuqs/server';

import {diffSearchParsers} from './_search-params.parsers';

export const loadDiffSearchParams = createLoader(diffSearchParsers);
