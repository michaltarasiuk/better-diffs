import {describe, expect, it} from 'vitest';
import {z} from 'zod';

import {ApiError, ErrorResponse} from '../error';

const UNKNOWN_STATUS = {code: 418, status: 'TEAPOT', reason: '', message: ''};

describe('ApiError', () => {
  it('maps codes to HTTP statuses', () => {
    const options = {reason: 'TEST'};

    expect(new ApiError('INVALID_ARGUMENT', '', options).httpStatus).toBe(400);
    expect(new ApiError('UNAUTHENTICATED', '', options).httpStatus).toBe(401);
    expect(new ApiError('NOT_FOUND', '', options).httpStatus).toBe(404);
    expect(new ApiError('INTERNAL', '', options).httpStatus).toBe(500);
  });

  it('is an Error', () => {
    const error = new ApiError('NOT_FOUND', 'Share not found.', {
      reason: 'SHARE_NOT_FOUND',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Share not found.');
  });

  it('serializes to an error response', () => {
    const error = new ApiError('NOT_FOUND', 'Share not found.', {
      reason: 'SHARE_NOT_FOUND',
      metadata: {shareId: 'abc'},
    });

    expect(error.toJSON()).toEqual({
      error: {
        code: 404,
        status: 'NOT_FOUND',
        reason: 'SHARE_NOT_FOUND',
        message: 'Share not found.',
        metadata: {shareId: 'abc'},
        fieldViolations: undefined,
      },
    });
    expect(ErrorResponse.safeParse(error.toJSON()).success).toBe(true);
  });

  it('omits optional fields from the JSON body', () => {
    const error = new ApiError('INTERNAL', 'Internal error.', {
      reason: 'INTERNAL',
    });

    expect(JSON.parse(JSON.stringify(error))).toEqual({
      error: {
        code: 500,
        status: 'INTERNAL',
        reason: 'INTERNAL',
        message: 'Internal error.',
      },
    });
  });

  it('round-trips through JSON', () => {
    const error = new ApiError('INVALID_ARGUMENT', 'Bad.', {
      reason: 'INVALID_FIELDS',
      metadata: {a: 'b'},
      fieldViolations: [{field: 'name', description: 'Required'}],
    });

    const parsed = ApiError.fromJSON(JSON.parse(JSON.stringify(error)));

    expect(parsed).toBeInstanceOf(ApiError);
    expect(parsed).toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: 'Bad.',
      reason: 'INVALID_FIELDS',
      metadata: {a: 'b'},
      fieldViolations: [{field: 'name', description: 'Required'}],
    });
  });

  it.each([
    ['a non-object', 'Not found'],
    ['a missing error', {}],
    ['an unknown status', {error: UNKNOWN_STATUS}],
  ])('fails to parse %s', (_name, value) => {
    expect(() => ApiError.fromJSON(value)).toThrow(z.ZodError);
  });

  it('builds an invalid argument error from a ZodError', () => {
    const schema = z.object({
      name: z.string(),
      items: z.array(z.object({count: z.int()})),
    });
    const {error} = schema.safeParse({items: [{count: 1}, {count: 'x'}]});

    const apiError = ApiError.invalidArgument(error!);

    expect(apiError).toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: 'Request has invalid fields.',
      reason: 'INVALID_FIELDS',
      fieldViolations: [
        {field: 'name', description: expect.any(String)},
        {field: 'items[1].count', description: expect.any(String)},
      ],
    });
  });
});
