function uuid<T extends string>(suffix: T) {
  return `00000000-0000-4000-8000-0000000000${suffix}` as const;
}

/*
 * Stable ids for assertions. Suffix map (hex):
 * 01 SHARE_ID  ff SHARE_ID_SECONDARY  02 EVENT_ID  03 THREAD_ID
 * 04 THREAD_ID_SECONDARY  05 COMMENT_ID  06 COMMENT_ID_SECONDARY
 * 07 USER_ID  08 PATCH_ID  09 FILE_ID  fe MISSING_ID
 */
export const SHARE_ID = uuid('01');
export const SHARE_ID_SECONDARY = uuid('ff');
export const EVENT_ID = uuid('02');
export const THREAD_ID = uuid('03');
export const THREAD_ID_SECONDARY = uuid('04');
export const COMMENT_ID = uuid('05');
export const COMMENT_ID_SECONDARY = uuid('06');
export const USER_ID = uuid('07');
export const PATCH_ID = uuid('08');
export const FILE_ID = uuid('09');
export const MISSING_ID = uuid('fe');

export const EVENT_CURSOR_SEQ = 4;
export const CREATED_AT = '2026-01-01T00:00:00.000Z';
export const FILE_PATH = 'src/a.ts';
