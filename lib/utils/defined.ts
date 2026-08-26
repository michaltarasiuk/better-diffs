export function isDefined(v: unknown) {
  return v != null;
}

export function assertDefined<T>(
  v: T | null | undefined,
  message: string,
): asserts v is T {
  if (!isDefined(v)) {
    throw new Error(message);
  }
}
