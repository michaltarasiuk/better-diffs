import {describe, expect, it} from 'vitest';

import {Authorization} from './authorization';

describe('Authorization.from', () => {
  it('reads the scheme and credentials', () => {
    expect(Authorization.from('Bearer abc')).toMatchObject({
      credentials: 'abc',
      scheme: 'Bearer',
    });
  });

  it('keeps spaces inside credentials', () => {
    expect(Authorization.from('Custom a b').credentials).toBe('a b');
  });

  it('ignores surrounding whitespace', () => {
    expect(Authorization.from('  Bearer   abc  ')).toMatchObject({
      credentials: 'abc',
      scheme: 'Bearer',
    });
  });

  it('reads a scheme without credentials', () => {
    expect(Authorization.from('Bearer')).toMatchObject({
      credentials: undefined,
      scheme: 'Bearer',
    });
  });

  it.each([
    {name: 'a missing header', value: null},
    {name: 'an empty header', value: ''},
    {name: 'a blank header', value: '   '},
  ])('treats $name as having no scheme', ({value}) => {
    expect(Authorization.from(value)).toMatchObject({
      credentials: undefined,
      scheme: undefined,
    });
  });

  it('accepts an object instead of a string', () => {
    const header = Authorization.from({credentials: 'abc', scheme: 'Bearer'});

    expect(header.toString()).toBe('Bearer abc');
  });
});

describe('Authorization#hasScheme', () => {
  it.each(['Bearer', 'bearer', 'BEARER'])('matches %s', (scheme) => {
    expect(Authorization.from('Bearer abc').hasScheme(scheme)).toBe(true);
  });

  it('rejects a different scheme', () => {
    expect(Authorization.from('Basic abc').hasScheme('Bearer')).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(Authorization.from(null).hasScheme('Bearer')).toBe(false);
  });
});

describe('Authorization#toString', () => {
  it('renders a missing header as empty', () => {
    expect(Authorization.from(null).toString()).toBe('');
  });

  it('renders a scheme without credentials', () => {
    expect(Authorization.from({scheme: 'Bearer'}).toString()).toBe('Bearer');
  });

  it('round-trips a full header', () => {
    expect(Authorization.from('Bearer abc').toString()).toBe('Bearer abc');
  });
});

describe('new Authorization', () => {
  it('builds an empty header with no argument', () => {
    expect(new Authorization().toString()).toBe('');
  });

  it('parses a string argument like the static factory', () => {
    expect(new Authorization('Bearer abc').credentials).toBe('abc');
  });
});
