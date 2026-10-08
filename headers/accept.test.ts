import {describe, expect, it} from 'vitest';

import {Accept} from './accept';

describe('Accept', () => {
  it('initializes with an empty string', () => {
    const header = new Accept('');
    expect(header.size).toBe(0);
  });

  it('initializes with a string', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    expect(header.size).toBe(2);
  });

  it('initializes with an array', () => {
    const header = new Accept(['text/html', ['application/json', 0.9]]);
    expect(header.size).toBe(2);
  });

  it('initializes with an object', () => {
    const header = new Accept({'text/html': 1, 'application/json': 0.9});
    expect(header.size).toBe(2);
  });

  it('initializes with another Accept', () => {
    const header = new Accept(new Accept('text/html,application/json;q=0.9'));
    expect(header.size).toBe(2);
  });

  it('handles whitespace in initial value', () => {
    const header = new Accept(' text/html ,  application/json;q=  0.9  ');
    expect(header.size).toBe(2);
  });

  it('preserves weights and ordering around empty list entries', () => {
    const header = Accept.from(
      ' , TEXT/HTML ;q=0.5,\t,application/json;q=0.9, text/html;q=0.7, ',
    );

    expect(Array.from(header)).toEqual([
      ['application/json', 0.9],
      ['text/html', 0.7],
    ]);
    expect(Accept.from(' \t ').size).toBe(0);

    const value = `text/html,application/json${' '.repeat(100)};q=0.5`;
    expect(Array.from(Accept.from(value))).toEqual([
      ['text/html', 1],
      ['application/json', 0.5],
    ]);
  });

  it('gets all media types', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    expect(header.mediaTypes).toEqual(['text/html', 'application/json']);
  });

  it('gets all weights', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    expect(header.weights).toEqual([1, 0.9]);
  });

  it('checks if a media type is acceptable', () => {
    const header = new Accept('text/html,text/*;q=0.9,application/json;q=0.8');
    expect(header.accepts('text/html')).toBe(true);
    expect(header.accepts('text/*')).toBe(true);
    expect(header.accepts('text/plain')).toBe(true);
    expect(header.accepts('application/json')).toBe(true);
    expect(header.accepts('image/jpeg')).toBe(false);
  });

  it('gets the correct weight values', () => {
    const header = new Accept('text/html,text/*;q=0.9,application/json;q=0.8');
    expect(header.getWeight('text/html')).toBe(1);
    expect(header.getWeight('*/*')).toBe(1);
    expect(header.getWeight('text/*')).toBe(1);
    expect(header.getWeight('text/plain')).toBe(0.9);
    expect(header.getWeight('application/json')).toBe(0.8);
    expect(header.getWeight('image/jpeg')).toBe(0);
  });

  it('gets the preferred media type', () => {
    const header = new Accept('text/html,text/*;q=0.9,application/json;q=0.8');
    expect(header.getPreferred(['text/html', 'application/json'])).toBe(
      'text/html',
    );
    expect(header.getPreferred(['text/plain', 'text/html'])).toBe('text/html');
    expect(header.getPreferred(['image/jpeg'])).toBe(null);
  });

  it('sets and gets media types', () => {
    const header = new Accept();
    header.set('application/json', 0.9);
    expect(header.get('application/json')).toBe(0.9);
  });

  it('deletes media types', () => {
    const header = new Accept('text/html');
    expect(header.has('text/html')).toBe(true);
    header.delete('text/html');
    expect(header.has('text/html')).toBe(false);
  });

  it('clears all media types', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    header.clear();
    expect(header.size).toBe(0);
  });

  it('iterates over entries', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    const entries = Array.from(header.entries());
    expect(entries).toEqual([
      ['text/html', 1],
      ['application/json', 0.9],
    ]);
  });

  it('is directly iterable', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    const mediaTypes = Array.from(header);
    expect(mediaTypes).toEqual([
      ['text/html', 1],
      ['application/json', 0.9],
    ]);
  });

  it('uses forEach correctly', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    const result: [string, number][] = [];
    header.forEach((mediaType, weight) => {
      result.push([mediaType, weight]);
    });
    expect(result).toEqual([
      ['text/html', 1],
      ['application/json', 0.9],
    ]);
  });

  it('returns correct size', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    expect(header.size).toBe(2);
  });

  it('converts to string correctly', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    expect(header.toString()).toBe('text/html,application/json;q=0.9');
  });

  it('handles setting empty weight values', () => {
    const header = new Accept();
    header.set('text/html');
    expect(header.get('text/html')).toBe(1);
  });

  it('overwrites existing weight values', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    header.set('application/json', 0.8);
    expect(header.get('application/json')).toBe(0.8);
  });

  it('handles setting wildcard media types', () => {
    const header = new Accept();
    header.set('*/*');
    expect(header.get('*/*')).toBe(1);
  });

  it('sorts initial value', () => {
    const header = new Accept('application/json;q=0.9,text/html');
    expect(header.toString()).toBe('text/html,application/json;q=0.9');
    expect(header.mediaTypes).toEqual(['text/html', 'application/json']);
  });

  it('sorts updated value', () => {
    const header = new Accept('text/html,application/json;q=0.9');
    header.set('application/json', 0.8);
    expect(header.toString()).toBe('text/html,application/json;q=0.8');
    expect(header.mediaTypes).toEqual(['text/html', 'application/json']);
  });
});

describe('Accept.from', () => {
  it('parses a string value', () => {
    const result = Accept.from('text/html, application/json;q=0.9');
    expect(result).toBeInstanceOf(Accept);
    expect(result.size).toBe(2);
    expect(result.getWeight('text/html')).toBe(1);
    expect(result.getWeight('application/json')).toBe(0.9);
  });

  it('returns empty instance for null', () => {
    const result = Accept.from(null);
    expect(result).toBeInstanceOf(Accept);
    expect(result.size).toBe(0);
  });

  it('accepts init object', () => {
    const result = Accept.from({'text/html': 1});
    expect(result).toBeInstanceOf(Accept);
    expect(result.size).toBe(1);
  });
});
