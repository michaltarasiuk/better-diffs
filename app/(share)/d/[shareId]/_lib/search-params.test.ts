import {describe, expect, it} from 'vitest';

import {env} from '@/env';

import {loadDiffSearchParams} from './search-params';

const SEARCH_QUERY = 'query with spaces';

const SELECTED_LINES = {
  id: 'src/a.ts',
  range: {start: 3, end: 9, side: 'additions'},
};

function load(params: Record<string, string> = {}) {
  const url = new URL(`${env.BASE_URL}/d/share-id`);
  url.search = new URLSearchParams(params).toString();
  return loadDiffSearchParams(url);
}

describe('loadDiffSearchParams', () => {
  it('returns null for both params on a bare URL', () => {
    expect(load()).toEqual({q: null, lines: null});
  });

  describe('q', () => {
    it('decodes the search query from the URL', () => {
      expect(load({q: SEARCH_QUERY}).q).toBe(SEARCH_QUERY);
    });

    it('treats an empty q param as absent', () => {
      expect(load({q: ''}).q).toBe(null);
    });
  });

  describe('lines', () => {
    it('parses a valid SelectedLines payload', () => {
      expect(load({lines: JSON.stringify(SELECTED_LINES)}).lines).toEqual(
        SELECTED_LINES,
      );
    });

    it.each([
      ['malformed JSON', '{not json'],
      ['schema validation failure', '{"id":"a"}'],
      ['the wrong JSON shape', '[]'],
    ])('returns null for %s', (_name, value) => {
      expect(load({lines: value}).lines).toBe(null);
    });
  });
});
