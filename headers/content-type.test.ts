import {describe, expect, it} from 'vitest';

import {ContentType} from './content-type';

describe('ContentType.from', () => {
  it('reads the media type on its own', () => {
    expect(ContentType.from('text/plain')).toMatchObject({
      boundary: undefined,
      charset: undefined,
      mediaType: 'text/plain',
    });
  });

  it('reads the charset parameter', () => {
    const header = ContentType.from(
      'multipart/form-data; charset=utf-8; boundary=----abc',
    );

    expect(header.charset).toBe('utf-8');
  });

  it('reads the boundary parameter', () => {
    expect(
      ContentType.from('multipart/form-data; charset=utf-8; boundary=----abc')
        .boundary,
    ).toBe('----abc');
  });

  it('unwraps a quoted boundary that contains a delimiter', () => {
    expect(
      ContentType.from('multipart/form-data; boundary="a;b"').boundary,
    ).toBe('a;b');
  });

  it('reads modeled parameters from a header', () => {
    const header = ContentType.from('text/plain; name=file.txt; charset=utf-8');

    expect(header.charset).toBe('utf-8');
  });

  it('ignores parameters it does not model', () => {
    const header = ContentType.from('text/plain; name=file.txt; charset=utf-8');

    expect(header).not.toHaveProperty('name');
  });

  it('treats a missing header as having no media type', () => {
    expect(ContentType.from(null).mediaType).toBeUndefined();
  });

  it('renders a missing header as empty', () => {
    expect(ContentType.from(null).toString()).toBe('');
  });

  it('accepts an object instead of a string', () => {
    const header = ContentType.from({
      charset: 'utf-8',
      mediaType: 'text/html',
    });

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
        boundary: 'a;b',
        mediaType: 'multipart/form-data',
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
