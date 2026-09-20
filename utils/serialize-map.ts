export function serializeMap<K, V>(map: ReadonlyMap<K, V>) {
  return JSON.stringify([...map]);
}

export function deserializeMap<K, V>(text: string) {
  const parsed: unknown = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new TypeError('Map entries are not an array');
  }

  return new Map(parsed as [K, V][]);
}
