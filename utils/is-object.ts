import {isDefined} from './is-defined';

export function isObject(value: unknown): value is object {
  return isDefined(value) && typeof value === 'object';
}
