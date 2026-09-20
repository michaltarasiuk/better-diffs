import {describe, expect, it} from 'vitest';

import {deserializeMap, serializeMap} from './serialize-map';

describe('serializeMap', () => {
  it('serializes an empty map', () => {
    expect(serializeMap(new Map())).toBe('[]');
  });

  it('serializes map entries in insertion order', () => {
    const map = new Map([
      ['b', 2],
      ['a', 1],
    ]);

    expect(serializeMap(map)).toBe(
      JSON.stringify([
        ['b', 2],
        ['a', 1],
      ]),
    );
  });
});

describe('deserializeMap', () => {
  it('deserializes an empty map', () => {
    expect(deserializeMap('[]')).toEqual(new Map());
  });

  it('deserializes map entries', () => {
    const map = deserializeMap<string, number>(
      JSON.stringify([
        ['b', 2],
        ['a', 1],
      ]),
    );

    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
    expect([...map.keys()]).toEqual(['b', 'a']);
  });

  it('round-trips nested object values', () => {
    interface Preference {
      enabled: boolean;
      tags: readonly string[];
    }

    const original = new Map<string, Preference>([
      ['notifications', {enabled: true, tags: ['email', 'push']}],
      ['theme', {enabled: false, tags: []}],
    ]);

    const restored = deserializeMap<string, Preference>(serializeMap(original));

    expect(restored).toEqual(original);
  });

  it('throws when stored text is not an array', () => {
    expect(() => deserializeMap('{"a":1}')).toThrow(TypeError);
    expect(() => deserializeMap('{"a":1}')).toThrow(
      'Map entries are not an array',
    );
  });
});
