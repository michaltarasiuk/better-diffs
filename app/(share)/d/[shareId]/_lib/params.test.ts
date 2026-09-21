import {describe, expect, it} from 'vitest';

import type {SelectedLines} from '@/diffs/schemas';
import {loadParams} from './params';

const QUERY = 'query with spaces';

const LINES = {
  id: 'file.txt',
  range: {
    start: 3,
    end: 9,
    side: 'additions',
  },
} satisfies SelectedLines;

describe('loadParams', () => {
  it('defaults the query to null', () => {
    expect(loadParams({}).q).toBe(null);
  });

  it('defaults line selection to null', () => {
    expect(loadParams({}).lines).toBe(null);
  });

  describe('q', () => {
    it('passes through the value', () => {
      expect(loadParams({q: QUERY}).q).toBe(QUERY);
    });

    it('returns null for an empty string', () => {
      expect(loadParams({q: ''}).q).toBe(null);
    });
  });

  describe('lines', () => {
    it('parses a valid line selection from JSON', () => {
      expect(loadParams({lines: JSON.stringify(LINES)}).lines).toEqual(LINES);
    });

    it.each([
      ['malformed JSON', '{not json'],
      ['incomplete SelectedLines', '{"id":"a"}'],
      ['a non-object payload', '[]'],
    ])('returns null for %s', (_name, value) => {
      expect(loadParams({lines: value}).lines).toBe(null);
    });
  });
});
