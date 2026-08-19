export function isPresent(value: unknown) {
  return value != null;
}

export function assertPresent<T>(
  value: T | null | undefined,
  message: string,
): asserts value is T {
  if (!isPresent(value)) {
    throw new Error(message);
  }
}
