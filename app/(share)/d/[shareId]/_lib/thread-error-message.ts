import type {ThreadErrorReason} from '@/threads/errors';

const MESSAGES: Record<ThreadErrorReason, string> = {
  INVALID_INPUT: 'The comment could not be read',
  SHARE_NOT_FOUND: 'This diff no longer exists',
  THREAD_ALREADY_EXISTS: 'This thread already exists',
  THREAD_NOT_FOUND: 'This thread no longer exists',
  THREAD_RESOLVED: 'This thread was resolved',
  COMMENT_ALREADY_EXISTS: 'This comment already exists',
  COMMENT_NOT_FOUND: 'This comment no longer exists',
  LAST_COMMENT: 'A thread keeps its last comment; edit it instead',
  NOT_OWNER: 'Only its author can change this comment',
  SAVE_FAILED: 'Check your connection and try again',
};

export function threadErrorMessage(reason: ThreadErrorReason) {
  return MESSAGES[reason];
}
