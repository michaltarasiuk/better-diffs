import {describe, expect, it} from 'vitest';

import {Authorization} from '../authorization';

describe('Authorization', () => {
  it('initializes with an empty string', () => {
    const header = new Authorization('');
    expect(header.scheme).toBeUndefined();
    expect(header.credentials).toBeUndefined();
  });

  it('initializes with a string', () => {
    const header = new Authorization('Bearer token123');
    expect(header.scheme).toBe('Bearer');
    expect(header.credentials).toBe('token123');
  });

  it('initializes with an object', () => {
    const header = new Authorization({
      scheme: 'Bearer',
      credentials: 'token123',
    });
    expect(header.scheme).toBe('Bearer');
    expect(header.credentials).toBe('token123');
  });

  it('initializes with another Authorization', () => {
    const header = new Authorization(new Authorization('Bearer token123'));
    expect(header.scheme).toBe('Bearer');
    expect(header.credentials).toBe('token123');
  });

  it('handles whitespace in initial value', () => {
    const header = new Authorization('  Bearer  token123  ');
    expect(header.scheme).toBe('Bearer');
    expect(header.credentials).toBe('token123');
  });

  it('handles only scheme without credentials', () => {
    const header = new Authorization('Bearer');
    expect(header.scheme).toBe('Bearer');
    expect(header.credentials).toBeUndefined();
  });

  it('hasScheme is case-insensitive', () => {
    const header = new Authorization('Bearer token123');
    expect(header.hasScheme('bearer')).toBe(true);
    expect(header.hasScheme('BEARER')).toBe(true);
    expect(header.hasScheme('Bearer')).toBe(true);
    expect(header.hasScheme('Basic')).toBe(false);
  });

  it('toString returns correct format with credentials', () => {
    const header = new Authorization('Bearer token123');
    expect(header.toString()).toBe('Bearer token123');
  });

  it('toString returns only scheme when no credentials', () => {
    const header = new Authorization({scheme: 'Bearer'});
    expect(header.toString()).toBe('Bearer');
  });

  it('toString returns empty string when no scheme', () => {
    const header = new Authorization({});
    expect(header.toString()).toBe('');
  });

  describe('Authorization.from', () => {
    it('parses a string value', () => {
      const result = Authorization.from('Bearer token123');
      expect(result).toBeInstanceOf(Authorization);
      expect(result.scheme).toBe('Bearer');
      expect(result.credentials).toBe('token123');
    });

    it('returns empty instance for null', () => {
      const result = Authorization.from(null);
      expect(result).toBeInstanceOf(Authorization);
      expect(result.scheme).toBeUndefined();
      expect(result.credentials).toBeUndefined();
    });

    it('accepts init object', () => {
      const result = Authorization.from({
        scheme: 'Bearer',
        credentials: 'token123',
      });
      expect(result).toBeInstanceOf(Authorization);
      expect(result.scheme).toBe('Bearer');
      expect(result.credentials).toBe('token123');
    });

    it('handles string with only scheme', () => {
      const result = Authorization.from('Bearer');
      expect(result.scheme).toBe('Bearer');
      expect(result.credentials).toBeUndefined();
    });

    it('handles string with extra whitespace', () => {
      const result = Authorization.from('  Basic  dXNlcjpwYXNz  ');
      expect(result.scheme).toBe('Basic');
      expect(result.credentials).toBe('dXNlcjpwYXNz');
    });

    it('handles various auth schemes', () => {
      const schemes = [
        {scheme: 'Bearer', credentials: 'token123'},
        {scheme: 'Basic', credentials: 'dXNlcjpwYXNz'},
        {scheme: 'Digest', credentials: 'username="user", realm="test"'},
        {scheme: 'HOBA', credentials: 'result="abc123"'},
        {scheme: 'Mutual', credentials: 'xyz'},
        {scheme: 'AWS4-HMAC-SHA256', credentials: 'Credential=AKIA...'},
      ];

      for (const {scheme, credentials} of schemes) {
        const result = Authorization.from(`${scheme} ${credentials}`);
        expect(result.scheme).toBe(scheme);
        expect(result.credentials).toBe(credentials);
      }
    });
  });
});
