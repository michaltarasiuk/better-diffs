import 'server-only';

import {unstable_rethrow} from 'next/navigation';
import type {z} from 'zod';

import {Accept} from '@/headers/accept';

import {ApiError} from './error';

export interface RouteOptions {
  readonly headers?: HeadersInit;
}

export function route<T>(
  handler: (request: Request, context: T) => Promise<Response>,
  options: RouteOptions = {},
) {
  return async (request: Request, context: T) => {
    let response: Response;
    try {
      response = await handler(request, context);
    } catch (error) {
      unstable_rethrow(error);
      response = errorResponse(request, toApiError(error));
    }

    for (const [name, value] of new Headers(options.headers)) {
      response.headers.set(name, value);
    }
    return response;
  };
}

export function prefersText(request: Request) {
  const accept = Accept.from(request.headers.get('Accept'));
  return (
    accept.getPreferred(['application/json', 'text/plain']) === 'text/plain'
  );
}

export function parse<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw ApiError.invalidArgument(result.error);
  }
  return result.data;
}

export function parseSearchParams<T extends z.ZodType>(
  schema: T,
  request: Request,
) {
  const {searchParams} = new URL(request.url);
  return parse(schema, Object.fromEntries(searchParams));
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError('INVALID_ARGUMENT', 'Request body is not valid JSON.', {
      reason: 'INVALID_JSON',
    });
  }
}

function toApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  console.error(error);
  return new ApiError('INTERNAL', 'Internal error.', {reason: 'INTERNAL'});
}

function errorResponse(request: Request, error: ApiError) {
  const headers = new Headers();
  if (error.code === 'UNAUTHENTICATED') {
    headers.set('WWW-Authenticate', 'Bearer');
  }

  if (prefersText(request)) {
    return new Response(error.message, {status: error.httpStatus, headers});
  }
  return Response.json(error.toJSON(), {
    status: error.httpStatus,
    headers,
  });
}
