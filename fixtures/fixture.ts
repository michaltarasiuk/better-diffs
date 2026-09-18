function uuid<T extends string>(suffix: T) {
  return `00000000-0000-4000-8000-0000000000${suffix}` as const;
}

export const FIXTURE = {
  share: {
    id: uuid('01'),
    alt: uuid('ff'),
  },
  event: {
    id: uuid('02'),
  },
  thread: {
    id: uuid('03'),
    second: uuid('04'),
  },
  comment: {
    id: uuid('05'),
    second: uuid('06'),
  },
  actor: {
    id: uuid('07'),
  },
  unknown: {
    id: uuid('fe'),
  },
  time: {
    created: '2026-01-01T00:00:00.000Z',
  },
} as const;
