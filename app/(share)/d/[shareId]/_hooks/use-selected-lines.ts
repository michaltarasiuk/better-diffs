import {useQueryState} from 'nuqs';

import {searchParsers} from '../_lib/params';

export function useSelectedLines() {
  const [selectedLines, setSelectedLines] = useQueryState(
    'lines',
    searchParsers.lines.withOptions({history: 'replace'}),
  );

  return {selectedLines, setSelectedLines};
}
