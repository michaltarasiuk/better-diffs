import {isDefined} from './defined';

export function isIterable<T>(value: unknown): value is Iterable<T> {
  return (
    isDefined(value) &&
    Symbol.iterator in value &&
    value[Symbol.iterator] === 'function'
  );
}
