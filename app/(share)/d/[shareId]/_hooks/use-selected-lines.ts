import {useQueryState} from 'nuqs';

import {diffSearchParsers} from '../_lib/search-params';

export function useSelectedLines() {
  const [selectedLines, setSelectedLines] = useQueryState(
    'lines',
    diffSearchParsers.lines.withOptions({history: 'replace'}),
  );

  return {selectedLines, setSelectedLines};
}
