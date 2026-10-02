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

  it('deserializes map entries in stored order', () => {
    const entries = [
      ['b', 2],
      ['a', 1],
    ];

    const map = deserializeMap<string, number>(JSON.stringify(entries));

    expect([...map]).toEqual(entries);
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

  it.each([
    {name: 'not an array', text: '{"a":1}'},
    {name: 'an array of non-entries', text: '[1,2]'},
    {name: 'an array with a short entry', text: '[["a"]]'},
    {name: 'an array with a long entry', text: '[["a",1,2]]'},
  ])('throws when stored text is $name', ({text}) => {
    expect(() => deserializeMap(text)).toThrow(
      new TypeError('Invalid map entries'),
    );
  });
});
