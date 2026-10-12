import type {z} from 'zod';

import {ApiError} from './error';

export async function fetchJson<T extends z.ZodType>(
  input: RequestInfo | URL,
  schema: T,
  init?: RequestInit,
) {
  const response = await fetch(input, init);
  const body: unknown = await response.json();

  if (!response.ok) {
    throw ApiError.fromJSON(body);
  }
  return schema.parse(body);
}
