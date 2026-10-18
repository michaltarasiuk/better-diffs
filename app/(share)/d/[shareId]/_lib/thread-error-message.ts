import type {ThreadErrorReason} from '#/threads/errors';

const MESSAGES: Record<ThreadErrorReason, string> = {
  INVALID_INPUT: 'The comment could not be read',
  SHARE_NOT_FOUND: 'This diff no longer exists',
  FILE_NOT_FOUND: 'This file is not part of the diff',
  THREAD_ALREADY_EXISTS: 'This thread already exists',
  THREAD_NOT_FOUND: 'This thread no longer exists',
  COMMENT_ALREADY_EXISTS: 'This comment already exists',
  SAVE_FAILED: 'Check your connection and try again',
};

export function threadErrorMessage(reason: ThreadErrorReason) {
  return MESSAGES[reason];
}
