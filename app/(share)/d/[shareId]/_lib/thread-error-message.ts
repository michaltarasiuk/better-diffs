import {fbs} from 'fbtee';

import type {ThreadErrorReason} from '#/threads/errors';

export function threadErrorMessage(reason: ThreadErrorReason) {
  switch (reason) {
    case 'INVALID_INPUT':
      return fbs(
        'The comment could not be read',
        'Why a comment was not saved: the server rejected its content',
      );
    case 'SHARE_NOT_FOUND':
      return fbs(
        'This diff no longer exists',
        'Why a comment was not saved: the shared diff expired or was deleted',
      );
    case 'FILE_NOT_FOUND':
      return fbs(
        'This file is not part of the diff',
        'Why a comment was not saved: the commented file is not in the diff',
      );
    case 'THREAD_ALREADY_EXISTS':
      return fbs(
        'This thread already exists',
        'Why a comment was not saved: its conversation was already started',
      );
    case 'THREAD_NOT_FOUND':
      return fbs(
        'This thread no longer exists',
        'Why a reply was not saved: its conversation is missing',
      );
    case 'COMMENT_ALREADY_EXISTS':
      return fbs(
        'This comment already exists',
        'Why a comment was not saved: it was already stored',
      );
    case 'SAVE_FAILED':
      return fbs(
        'Check your connection and try again',
        'Why a comment was not saved: the request failed',
      );
  }
}
