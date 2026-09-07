import {isDefined} from '@/lib/utils/defined';

export function isIterable<T>(value: unknown): value is Iterable<T> {
  return (
    isDefined(value) &&
    typeof (value as Iterable<T>)[Symbol.iterator] === 'function'
  );
}
