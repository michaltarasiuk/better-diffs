export type ThreadErrorReason =
  | 'INVALID_INPUT'
  | 'THREAD_ALREADY_EXISTS'
  | 'THREAD_NOT_FOUND'
  | 'THREAD_RESOLVED'
  | 'COMMENT_ALREADY_EXISTS'
  | 'COMMENT_NOT_FOUND'
  | 'NOT_OWNER';

export class ThreadError extends Error {
  readonly reason: ThreadErrorReason;

  constructor(reason: ThreadErrorReason, message: string) {
    super(message);
    this.name = 'ThreadError';
    this.reason = reason;
  }
}
