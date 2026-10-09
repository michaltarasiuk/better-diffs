import {describe, expect, it} from 'vitest';

import {jsonToMap, mapToJson} from '../map';

describe('mapToJson', () => {
  it('serializes entries in insertion order', () => {
    const map = new Map<string, number>([
      ['b', 2],
      ['a', 1],
    ]);

    expect(mapToJson(map)).toBe('[["b",2],["a",1]]');
  });

  it('serializes an empty map', () => {
    expect(mapToJson(new Map())).toBe('[]');
  });
});

describe('jsonToMap', () => {
  it('round-trips a map', () => {
    const map = new Map<string, {open: boolean}>([
      ['src/a.ts', {open: true}],
      ['src/b.ts', {open: false}],
    ]);

    expect(jsonToMap(mapToJson(map))).toEqual(map);
  });

  it.each([
    ['malformed JSON', '{nope'],
    ['an object', '{"a":1}'],
    ['a non-tuple entry', '[["a",1],"b"]'],
    ['an entry with too many items', '[["a",1,2]]'],
    ['null', 'null'],
  ])('returns an empty map for %s', (_name, text) => {
    expect(jsonToMap(text)).toEqual(new Map());
  });
});
