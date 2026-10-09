import {describe, expect, it} from 'vitest';

import {parseParams, quote} from '../param-values';

describe('parseParams', () => {
  it('correctly parses a string of parameters for a Content-Type header', () => {
    expect(parseParams('text/html; charset=utf-8')).toEqual([
      ['text/html', undefined],
      ['charset', 'utf-8'],
    ]);
    expect(parseParams('application/json')).toEqual([
      ['application/json', undefined],
    ]);
    expect(
      parseParams('multipart/form-data; boundary=----WebKitFormBoundaryABC123'),
    ).toEqual([
      ['multipart/form-data', undefined],
      ['boundary', '----WebKitFormBoundaryABC123'],
    ]);
  });

  it('correctly parses a string of parameters for a Content-Disposition header', () => {
    expect(parseParams('form-data; name=fieldName')).toEqual([
      ['form-data', undefined],
      ['name', 'fieldName'],
    ]);
    expect(
      parseParams('form-data; name="fieldName"; filename="filename.jpg"'),
    ).toEqual([
      ['form-data', undefined],
      ['name', 'fieldName'],
      ['filename', 'filename.jpg'],
    ]);
    expect(
      parseParams(
        "attachment; filename=photo.jpg; filename*=UTF-8''%E7%85%A7%E7%89%87.jpg",
      ),
    ).toEqual([
      ['attachment', undefined],
      ['filename', 'photo.jpg'],
      ['filename*', "UTF-8''%E7%85%A7%E7%89%87.jpg"],
    ]);
    expect(
      parseParams(
        'attachment; filename="photo.jpg"; filename*="UTF-8\'\'%E7%85%A7%E7%89%87.jpg"',
      ),
    ).toEqual([
      ['attachment', undefined],
      ['filename', 'photo.jpg'],
      ['filename*', "UTF-8''%E7%85%A7%E7%89%87.jpg"],
    ]);
  });

  it('correctly parses a string of parameters for a Set-Cookie header', () => {
    expect(parseParams('session_id=abc123; Path=/; HttpOnly; Secure')).toEqual([
      ['session_id', 'abc123'],
      ['Path', '/'],
      ['HttpOnly', undefined],
      ['Secure', undefined],
    ]);
    expect(
      parseParams('user_pref="dark_mode"; Max-Age=31536000; SameSite=Lax'),
    ).toEqual([
      ['user_pref', 'dark_mode'],
      ['Max-Age', '31536000'],
      ['SameSite', 'Lax'],
    ]);
    expect(
      parseParams(
        'preferences={"font":"Arial","size":"12pt"}; Expires=Fri, 31 Dec 2023 23:59:59 GMT',
      ),
    ).toEqual([
      ['preferences', '{"font":"Arial","size":"12pt"}'],
      ['Expires', 'Fri, 31 Dec 2023 23:59:59 GMT'],
    ]);
    expect(
      parseParams(
        'cart_items="[\\"item1\\",\\"item2\\"]"; Path=/cart; HttpOnly',
      ),
    ).toEqual([
      ['cart_items', '["item1","item2"]'],
      ['Path', '/cart'],
      ['HttpOnly', undefined],
    ]);
    expect(
      parseParams(
        'account_type="premium,\\"gold\\""; Domain=example.com; Secure',
      ),
    ).toEqual([
      ['account_type', 'premium,"gold"'],
      ['Domain', 'example.com'],
      ['Secure', undefined],
    ]);
    expect(
      parseParams(
        'a2f_token=987654; Path=/2fa; Secure; HttpOnly; SameSite=Strict; Max-Age=300',
      ),
    ).toEqual([
      ['a2f_token', '987654'],
      ['Path', '/2fa'],
      ['Secure', undefined],
      ['HttpOnly', undefined],
      ['SameSite', 'Strict'],
      ['Max-Age', '300'],
    ]);
  });

  it('handles quoted values with escaped characters', () => {
    expect(
      parseParams(String.raw`attachment; filename="one;two\".txt"`),
    ).toEqual([
      ['attachment', undefined],
      ['filename', 'one;two".txt'],
    ]);
  });

  it('handles parameters without values', () => {
    expect(parseParams('text/plain; charset')).toEqual([
      ['text/plain', undefined],
      ['charset', undefined],
    ]);
  });
});

describe('quote', () => {
  it('returns value as-is when no special characters', () => {
    expect(quote('simple')).toBe('simple');
    expect(quote('abc123')).toBe('abc123');
  });

  it('quotes value when it contains double quotes', () => {
    expect(quote('value"with"quotes')).toBe('"value\\"with\\"quotes"');
  });

  it('quotes value when it contains semicolons', () => {
    expect(quote('value;with;semicolons')).toBe('"value;with;semicolons"');
  });

  it('quotes value when it contains spaces', () => {
    expect(quote('value with spaces')).toBe('"value with spaces"');
  });

  it('handles empty string', () => {
    expect(quote('')).toBe('');
  });

  it('escapes existing double quotes', () => {
    expect(quote('he said "hello"')).toBe('"he said \\"hello\\""');
  });
});
