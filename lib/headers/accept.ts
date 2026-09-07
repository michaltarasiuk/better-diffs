import {isIterable, parseParams, type HeaderValue} from '@/lib/headers/utils';
import {isDefined} from '@/lib/utils/defined';

export type AcceptInit =
  Iterable<string | [string, number]> | Record<string, number>;

/**
 * The value of a `Accept` HTTP header.
 *
 * [MDN `Accept` Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept)
 *
 * [HTTP/1.1 Specification](https://datatracker.ietf.org/doc/html/rfc7231#section-5.3.2)
 */
export class Accept implements HeaderValue, Iterable<[string, number]> {
  #map: Map<string, number>;

  constructor(init?: string | AcceptInit) {
    this.#map = new Map();

    if (isDefined(init)) {
      if (typeof init === 'string') {
        for (const piece of init.split(/\s*,\s*/)) {
          const params = parseParams(piece);
          const first = params[0];
          if (!isDefined(first)) continue;

          const mediaType = first[0];
          let weight = 1;

          for (let i = 1; i < params.length; i++) {
            const param = params[i];
            if (!isDefined(param)) continue;

            const [key, value] = param;
            if (key === 'q') {
              weight = Number(value);
              break;
            }
          }

          this.#map.set(mediaType.toLowerCase(), weight);
        }
      } else if (isIterable(init)) {
        for (const mediaType of init) {
          if (Array.isArray(mediaType)) {
            this.#map.set(mediaType[0].toLowerCase(), mediaType[1]);
          } else {
            this.#map.set(mediaType.toLowerCase(), 1);
          }
        }
      } else {
        for (const mediaType of Object.getOwnPropertyNames(init)) {
          const weight = init[mediaType];
          if (!isDefined(weight)) continue;

          this.#map.set(mediaType.toLowerCase(), weight);
        }
      }

      this.#sort();
    }
  }

  #sort() {
    this.#map = new Map([...this.#map].sort((a, b) => b[1] - a[1]));
  }

  get mediaTypes() {
    return Array.from(this.#map.keys());
  }

  get weights() {
    return Array.from(this.#map.values());
  }

  get size() {
    return this.#map.size;
  }

  accepts(mediaType: string) {
    return this.getWeight(mediaType) > 0;
  }

  getWeight(mediaType: string) {
    const [type, subtype] = mediaType.toLowerCase().split('/');

    for (const [key, value] of this) {
      const [t, s] = key.split('/');
      if (
        (t === type || t === '*' || type === '*') &&
        (s === subtype || s === '*' || subtype === '*')
      ) {
        return value;
      }
    }

    return 0;
  }

  getPreferred(mediaTypes: string[]) {
    const sorted = mediaTypes
      .map((mediaType) => [mediaType, this.getWeight(mediaType)] as const)
      .sort((a, b) => b[1] - a[1]);

    const first = sorted[0];

    return isDefined(first) && first[1] > 0 ? first[0] : null;
  }

  get(mediaType: string) {
    return this.#map.get(mediaType.toLowerCase()) ?? null;
  }

  set(mediaType: string, weight = 1) {
    this.#map.set(mediaType.toLowerCase(), weight);
    this.#sort();
  }

  delete(mediaType: string) {
    this.#map.delete(mediaType.toLowerCase());
  }

  has(mediaType: string) {
    return this.#map.has(mediaType.toLowerCase());
  }

  clear() {
    this.#map.clear();
  }

  entries() {
    return this.#map.entries();
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  forEach(
    callback: (mediaType: string, weight: number, header: Accept) => void,
    thisArg?: unknown,
  ) {
    for (const [mediaType, weight] of this) {
      callback.call(thisArg, mediaType, weight, this);
    }
  }

  toString() {
    const pairs: string[] = [];

    for (const [mediaType, weight] of this.#map) {
      pairs.push(`${mediaType}${weight === 1 ? '' : `;q=${weight}`}`);
    }

    return pairs.join(',');
  }
}
