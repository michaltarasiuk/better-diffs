export function serializeMap<K, V>(map: ReadonlyMap<K, V>) {
  return JSON.stringify([...map]);
}

export function deserializeMap<K, V>(text: string) {
  const parsed: unknown = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new TypeError('Expected map entries to be an array');
  }

  return new Map(parsed as [K, V][]);
}
