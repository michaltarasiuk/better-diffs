import {useQueryState} from 'nuqs';

import {diffSearchParsers} from './search-params';

export function useSearchQuery() {
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    diffSearchParsers.q.withOptions({history: 'replace'}),
  );

  return {searchQuery, setSearchQuery};
}
