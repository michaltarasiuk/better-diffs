import {describe, expect, it} from 'vitest';

import {ContentType} from './content-type';

describe('ContentType.from', () => {
  it('reads the media type on its own', () => {
    expect(ContentType.from('text/plain')).toMatchObject({
      mediaType: 'text/plain',
      charset: undefined,
      boundary: undefined,
    });
  });

  it('reads charset and boundary parameters', () => {
    const header = ContentType.from(
      'multipart/form-data; charset=utf-8; boundary=----abc',
    );

    expect(header.mediaType).toBe('multipart/form-data');
    expect(header.charset).toBe('utf-8');
    expect(header.boundary).toBe('----abc');
  });

  it('unwraps a quoted boundary that contains a delimiter', () => {
    expect(
      ContentType.from('multipart/form-data; boundary="a;b"').boundary,
    ).toBe('a;b');
  });

  it('ignores parameters it does not model', () => {
    const header = ContentType.from('text/plain; name=file.txt; charset=utf-8');

    expect(header.charset).toBe('utf-8');
    expect(header).not.toHaveProperty('name');
  });

  it('treats a missing header as empty', () => {
    const header = ContentType.from(null);

    expect(header.mediaType).toBeUndefined();
    expect(header.toString()).toBe('');
  });

  it('accepts an object instead of a string', () => {
    const header = ContentType.from({mediaType: 'text/html', charset: 'utf-8'});

    expect(header.toString()).toBe('text/html; charset=utf-8');
  });
});

describe('ContentType#toString', () => {
  it('omits parameters that are not set', () => {
    expect(ContentType.from('text/plain').toString()).toBe('text/plain');
  });

  it('quotes a parameter that needs it', () => {
    expect(
      ContentType.from({
        mediaType: 'multipart/form-data',
        boundary: 'a;b',
      }).toString(),
    ).toBe('multipart/form-data; boundary="a;b"');
  });

  it('round-trips a full header', () => {
    const header = 'multipart/form-data; charset=utf-8; boundary="a;b"';

    expect(ContentType.from(header).toString()).toBe(header);
  });
});

describe('new ContentType', () => {
  it('builds an empty header with no argument', () => {
    expect(new ContentType().toString()).toBe('');
  });

  it('parses a string argument like the static factory', () => {
    expect(new ContentType('text/plain; charset=utf-8').charset).toBe('utf-8');
  });
});
