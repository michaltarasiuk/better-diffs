import {describe, expect, it} from 'vitest';

import {parseParams, quote} from './param-values';

describe('parseParams', () => {
  it('returns the leading token with no value', () => {
    expect(parseParams('text/plain')).toEqual([['text/plain', undefined]]);
  });

  it('reads trailing name/value pairs', () => {
    expect(parseParams('text/plain; charset=utf-8')).toEqual([
      ['text/plain', undefined],
      ['charset', 'utf-8'],
    ]);
  });

  it('trims whitespace around names, values and delimiters', () => {
    expect(parseParams('  text/plain ; charset = utf-8 ')).toEqual([
      ['text/plain', undefined],
      ['charset', 'utf-8'],
    ]);
  });

  it('keeps a delimiter that appears inside a quoted value', () => {
    expect(parseParams('multipart/form-data; boundary="a;b"')).toEqual([
      ['multipart/form-data', undefined],
      ['boundary', 'a;b'],
    ]);
  });

  it('unescapes quotes inside a quoted value', () => {
    expect(parseParams('text/plain; name="say \\"hi\\""')).toEqual([
      ['text/plain', undefined],
      ['name', 'say "hi"'],
    ]);
  });

  it('represents a valueless parameter as undefined', () => {
    expect(parseParams('text/plain; flag')).toEqual([
      ['text/plain', undefined],
      ['flag', undefined],
    ]);
  });

  it('splits on commas when asked to', () => {
    expect(parseParams('a=1,b=2', ',')).toEqual([
      ['a', '1'],
      ['b', '2'],
    ]);
  });

  it('returns nothing for an empty string', () => {
    expect(parseParams('')).toEqual([]);
  });

  it('starts from a clean slate on every call', () => {
    const input = 'text/plain; charset=utf-8';

    expect(parseParams(input)).toEqual(parseParams(input));
  });
});

describe('quote', () => {
  it.each([
    ['plain', 'plain'],
    ['has space', '"has space"'],
    ['has;semi', '"has;semi"'],
    ['has"quote', '"has\\"quote"'],
  ])('quotes %j as %j', (value, expected) => {
    expect(quote(value)).toBe(expected);
  });

  it('round-trips a value that needs quoting', () => {
    const value = 'boundary with; "both"';

    expect(parseParams(`x; name=${quote(value)}`)[1]).toEqual(['name', value]);
  });
});
