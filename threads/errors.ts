export type ThreadErrorReason =
  | 'INVALID_INPUT'
  | 'SHARE_NOT_FOUND'
  | 'THREAD_ALREADY_EXISTS'
  | 'THREAD_NOT_FOUND'
  | 'THREAD_RESOLVED'
  | 'COMMENT_ALREADY_EXISTS'
  | 'COMMENT_NOT_FOUND'
  | 'LAST_COMMENT'
  | 'NOT_OWNER'
  | 'SAVE_FAILED';

export interface ThreadError {
  readonly reason: ThreadErrorReason;
  readonly message: string;
}

export function threadError(
  reason: ThreadErrorReason,
  message: string,
): ThreadError {
  return {reason, message};
}
