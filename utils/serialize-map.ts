export function serializeMap<K, V>(map: ReadonlyMap<K, V>) {
  return JSON.stringify([...map]);
}

export function deserializeMap<K, V>(text: string) {
  const parsed: unknown = JSON.parse(text);

  if (!Array.isArray(parsed) || !parsed.every(isEntry)) {
    throw new Error('Invalid map entries');
  }

  return new Map(parsed as [K, V][]);
}

function isEntry(value: unknown) {
  return Array.isArray(value) && value.length === 2;
}
