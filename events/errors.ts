export type EventErrorReason =
  | 'INVALID_INPUT'
  | 'UNEXPECTED_SEQ'
  | 'THREAD_ALREADY_EXISTS'
  | 'THREAD_NOT_FOUND'
  | 'THREAD_RESOLVED'
  | 'COMMENT_ALREADY_EXISTS'
  | 'COMMENT_NOT_FOUND'
  | 'COMMENT_DELETED'
  | 'NOT_OWNER';

export class EventError extends Error {
  readonly reason: EventErrorReason;

  constructor(reason: EventErrorReason, message: string) {
    super(message);
    this.name = 'EventError';
    this.reason = reason;
  }
}

export function isEventError(error: unknown): error is EventError {
  return error instanceof EventError;
}
