export function isDefined(value: unknown) {
  return value != null;
}

export function assertDefined<T>(
  value: T | null | undefined,
  message: string,
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message);
  }
}
