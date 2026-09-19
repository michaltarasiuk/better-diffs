function uuid<T extends string>(suffix: T) {
  return `00000000-0000-4000-8000-0000000000${suffix}` as const;
}

export const SHARE_ID = uuid('01');
export const SHARE_ID_SECONDARY = uuid('ff');
export const EVENT_ID = uuid('02');
export const THREAD_ID = uuid('03');
export const THREAD_ID_SECONDARY = uuid('04');
export const COMMENT_ID = uuid('05');
export const COMMENT_ID_SECONDARY = uuid('06');
export const USER_ID = uuid('07');
export const MISSING_ID = uuid('fe');

export const CREATED_AT = '2026-01-01T00:00:00.000Z';
