import {isDefined} from './is-defined';

export function isIterable(value: unknown): value is Iterable<unknown> {
  return (
    isDefined(value) &&
    typeof (value as Partial<Iterable<unknown>>)[Symbol.iterator] === 'function'
  );
}
