import {describe, expect, it} from 'vitest';

import {loadDiffSearchParams} from './search-params';

const QUERY = 'query with spaces';
const LINES = {
  id: 'src/a.ts',
  range: {start: 3, end: 9, side: 'additions'},
};

describe('loadDiffSearchParams', () => {
  it('defaults query and line selection to null', () => {
    expect(loadDiffSearchParams({})).toEqual({q: null, lines: null});
  });

  describe('q', () => {
    it('passes through the value', () => {
      expect(loadDiffSearchParams({q: QUERY}).q).toBe(QUERY);
    });

    it('returns null for an empty string', () => {
      expect(loadDiffSearchParams({q: ''}).q).toBe(null);
    });
  });

  describe('lines', () => {
    it('parses a valid line selection from JSON', () => {
      expect(
        loadDiffSearchParams({lines: JSON.stringify(LINES)}).lines,
      ).toEqual(LINES);
    });

    it.each([
      ['malformed JSON', '{not json'],
      ['incomplete SelectedLines', '{"id":"a"}'],
      ['a non-object payload', '[]'],
    ])('returns null for %s', (_name, value) => {
      expect(loadDiffSearchParams({lines: value}).lines).toBe(null);
    });
  });
});
