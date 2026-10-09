import {describe, expect, it} from 'vitest';

import type {SelectedLines} from '@/diffs/schemas';

import {loadSearchParams} from '../params';

const QUERY = 'query with spaces';

const LINES = {
  id: 'file.txt',
  range: {
    start: 3,
    end: 9,
    side: 'additions',
  },
} satisfies SelectedLines;

describe('loadSearchParams', () => {
  it('defaults the query to null', () => {
    expect(loadSearchParams({}).q).toBe(null);
  });

  it('defaults line selection to null', () => {
    expect(loadSearchParams({}).lines).toBe(null);
  });

  describe('q', () => {
    it('returns the query string', () => {
      expect(loadSearchParams({q: QUERY}).q).toBe(QUERY);
    });

    it('returns null for an empty string', () => {
      expect(loadSearchParams({q: ''}).q).toBe(null);
    });
  });

  describe('lines', () => {
    it('parses a valid line selection from JSON', () => {
      expect(loadSearchParams({lines: JSON.stringify(LINES)}).lines).toEqual(
        LINES,
      );
    });

    it.each([
      ['malformed JSON', '{not json'],
      ['incomplete SelectedLines', '{"id":"a"}'],
      ['a zero line number', '{"id":"a","range":{"start":0,"end":2}}'],
      ['a fractional line number', '{"id":"a","range":{"start":1.5,"end":2}}'],
      ['a non-object payload', '[]'],
    ])('returns null for %s', (_name, value) => {
      expect(loadSearchParams({lines: value}).lines).toBe(null);
    });
  });
});
