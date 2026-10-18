import type {z} from 'zod';

import {ApiError, ErrorResponse} from './error';

export async function fetchJson<T extends z.ZodType>(
  input: RequestInfo | URL,
  schema: T,
  init?: RequestInit,
) {
  const response = await fetch(input, init);
  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw ErrorResponse.safeParse(body).success
      ? ApiError.fromJSON(body)
      : new ApiError(
          'INTERNAL',
          `Request failed with status ${response.status}.`,
          {reason: 'INTERNAL'},
        );
  }
  return schema.parse(body);
}
