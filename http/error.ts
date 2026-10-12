import {z} from 'zod';

export const Code = {
  INVALID_ARGUMENT: 400,
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  INTERNAL: 500,
} as const;
export type Code = keyof typeof Code;

const FieldViolation = z.object({
  field: z.string(),
  description: z.string(),
});
export type FieldViolation = z.infer<typeof FieldViolation>;

export const ErrorResponse = z.object({
  error: z.object({
    code: z.int(),
    status: z.enum(Object.keys(Code) as [Code, ...Code[]]),
    reason: z.string(),
    message: z.string(),
    metadata: z.record(z.string(), z.string()).optional(),
    fieldViolations: z.array(FieldViolation).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export interface ApiErrorOptions {
  readonly reason: string;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly fieldViolations?: readonly FieldViolation[];
}

export class ApiError extends Error {
  readonly code: Code;
  readonly reason: string;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly fieldViolations?: readonly FieldViolation[];

  constructor(code: Code, message: string, options: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.reason = options.reason;
    this.metadata = options.metadata;
    this.fieldViolations = options.fieldViolations;
  }

  get httpStatus() {
    return Code[this.code];
  }

  toJSON(): ErrorResponse {
    return {
      error: {
        code: this.httpStatus,
        status: this.code,
        reason: this.reason,
        message: this.message,
        metadata: this.metadata && {...this.metadata},
        fieldViolations: this.fieldViolations && [...this.fieldViolations],
      },
    };
  }

  static fromJSON(value: unknown) {
    const {error} = ErrorResponse.parse(value);
    return new ApiError(error.status, error.message, error);
  }

  static invalidArgument(error: z.ZodError) {
    const fieldViolations = error.issues.map((issue) => ({
      field: z.core.toDotPath(issue.path),
      description: issue.message,
    }));

    return new ApiError('INVALID_ARGUMENT', 'Request has invalid fields.', {
      reason: 'INVALID_FIELDS',
      fieldViolations,
    });
  }
}
