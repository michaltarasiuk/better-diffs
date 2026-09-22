function testUuid<T extends string>(suffix: T) {
  return `00000000-0000-4000-8000-0000000000${suffix}` as const;
}

export const CREATED_AT = '2026-01-01T00:00:00.000Z';

export const SHARE_ID = testUuid('01');
export const SHARE_ID_SECONDARY = testUuid('ff');

export const EVENT_ID = testUuid('02');

export const THREAD_ID = testUuid('03');
export const THREAD_ID_SECONDARY = testUuid('04');

export const COMMENT_ID = testUuid('05');
export const COMMENT_ID_SECONDARY = testUuid('06');

export const USER_ID = testUuid('07');

export const FORM_ID = testUuid('08');

export const MISSING_ID = testUuid('fe');
