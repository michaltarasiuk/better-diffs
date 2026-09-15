import {describe, expect, it} from 'vitest';

import {Accept} from './accept';

describe('Accept.from', () => {
  it('parses media types and their weights, heaviest first', () => {
    const accept = Accept.from('text/html;q=0.8,application/json,*/*;q=0.1');

    expect(accept.mediaTypes).toEqual(['application/json', 'text/html', '*/*']);
    expect(accept.weights).toEqual([1, 0.8, 0.1]);
  });

  it('lower-cases media types', () => {
    expect(Accept.from('TEXT/Plain').has('text/plain')).toBe(true);
  });

  it('treats a missing header as accepting nothing', () => {
    const accept = Accept.from(null);

    expect(accept.size).toBe(0);
    expect(accept.accepts('text/plain')).toBe(false);
  });
});

describe('Accept#getWeight', () => {
  it('matches a wildcard subtype', () => {
    expect(Accept.from('text/*;q=0.5').getWeight('text/plain')).toBe(0.5);
  });

  it('matches a full wildcard', () => {
    expect(Accept.from('*/*').getWeight('application/json')).toBe(1);
  });

  it('returns zero for a media type that was never offered', () => {
    expect(Accept.from('text/html').getWeight('application/json')).toBe(0);
  });
});

describe('Accept#getPreferred', () => {
  it('picks the heaviest acceptable option', () => {
    const accept = Accept.from('text/plain;q=0.4,application/json;q=0.9');

    expect(accept.getPreferred(['text/plain', 'application/json'])).toBe(
      'application/json',
    );
  });

  it('returns null when nothing on offer is acceptable', () => {
    expect(Accept.from('text/html').getPreferred(['application/json'])).toBe(
      null,
    );
  });
});

describe('Accept#toString', () => {
  it('round-trips through a header value, omitting the default weight', () => {
    const header = 'application/json,text/html;q=0.8';

    expect(Accept.from(header).toString()).toBe(header);
  });

  it('renders an empty header as an empty string', () => {
    expect(new Accept().toString()).toBe('');
  });
});

describe('new Accept', () => {
  it('starts empty when given nothing', () => {
    expect(new Accept().size).toBe(0);
  });

  it('parses a header string passed to the constructor', () => {
    expect(new Accept('text/html;q=0.5').getWeight('text/html')).toBe(0.5);
  });

  it('accepts the same shapes as Accept.from', () => {
    expect(new Accept(['text/html']).has('text/html')).toBe(true);
    expect(new Accept({'text/html': 0.2}).getWeight('text/html')).toBe(0.2);
  });
});

describe('Accept.from non-string input', () => {
  it('reads plain media types from an iterable, defaulting the weight', () => {
    const accept = Accept.from(['application/json', 'TEXT/html']);

    expect(accept.mediaTypes).toEqual(['application/json', 'text/html']);
    expect(accept.weights).toEqual([1, 1]);
  });

  it('reads media type and weight pairs from an iterable', () => {
    const accept = Accept.from([
      ['text/html', 0.3],
      ['application/json', 0.9],
    ]);

    expect(accept.mediaTypes).toEqual(['application/json', 'text/html']);
    expect(accept.weights).toEqual([0.9, 0.3]);
  });

  it('reads a Map, whose entries are already pairs', () => {
    const accept = Accept.from(
      new Map([
        ['text/html', 0.3],
        ['application/json', 0.9],
      ]),
    );

    expect(accept.mediaTypes).toEqual(['application/json', 'text/html']);
  });

  it('reads weights from a record', () => {
    const accept = Accept.from({'text/html': 0.4, 'application/json': 0.8});

    expect(accept.mediaTypes).toEqual(['application/json', 'text/html']);
    expect(accept.weights).toEqual([0.8, 0.4]);
  });

  it('skips record entries with no weight', () => {
    const accept = Accept.from({
      'text/html': 0.4,
      'application/json': undefined as unknown as number,
    });

    expect(accept.mediaTypes).toEqual(['text/html']);
  });

  it('treats an empty iterable and an empty record as accepting nothing', () => {
    expect(Accept.from([]).size).toBe(0);
    expect(Accept.from({}).size).toBe(0);
  });
});

describe('Accept mutation', () => {
  it('adds a media type at full weight by default', () => {
    const accept = new Accept();

    accept.set('text/plain');

    expect(accept.get('text/plain')).toBe(1);
  });

  it('re-sorts so the heaviest media type stays first', () => {
    const accept = Accept.from('text/html;q=0.5');

    accept.set('application/json', 0.9);

    expect(accept.mediaTypes).toEqual(['application/json', 'text/html']);
  });

  it('returns weights case-insensitively from get', () => {
    expect(Accept.from('text/html').get('TEXT/HTML')).toBe(1);
  });

  it('reports membership case-insensitively from has', () => {
    expect(Accept.from('text/html').has('TEXT/HTML')).toBe(true);
  });

  it('removes entries case-insensitively from delete', () => {
    const accept = Accept.from('text/html');

    accept.delete('TEXT/HTML');

    expect(accept.has('text/html')).toBe(false);
  });

  it('returns null for a media type it does not carry', () => {
    expect(Accept.from('text/html').get('application/json')).toBe(null);
  });

  it('drops everything on clear', () => {
    const accept = Accept.from('text/html,application/json');

    accept.clear();

    expect(accept.size).toBe(0);
  });
});

describe('Accept iteration', () => {
  it('iterates media type and weight pairs', () => {
    const accept = Accept.from('application/json,text/html;q=0.8');

    expect([...accept]).toEqual([
      ['application/json', 1],
      ['text/html', 0.8],
    ]);
    expect([...accept.entries()]).toEqual([...accept]);
  });

  it('visits every entry with forEach, passing the header along', () => {
    const accept = Accept.from('application/json,text/html;q=0.8');
    const seen: [string, number, boolean][] = [];

    accept.forEach((mediaType, weight, header) => {
      seen.push([mediaType, weight, header === accept]);
    });

    expect(seen).toEqual([
      ['application/json', 1, true],
      ['text/html', 0.8, true],
    ]);
  });

  it('binds thisArg inside forEach', () => {
    const accept = Accept.from('text/html');
    const thisArg = {seen: [] as string[]};

    accept.forEach(function (this: typeof thisArg, mediaType) {
      this.seen.push(mediaType);
    }, thisArg);

    expect(thisArg.seen).toEqual(['text/html']);
  });
});
