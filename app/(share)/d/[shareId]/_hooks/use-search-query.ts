import {useQueryState} from 'nuqs';

import {searchParsers} from '../_lib/params';

export function useSearchQuery() {
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    searchParsers.q.withOptions({history: 'replace'}),
  );

  return {searchQuery, setSearchQuery};
}
