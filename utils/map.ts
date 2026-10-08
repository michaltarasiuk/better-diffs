import {z} from 'zod';

const Entry = z.tuple([z.unknown(), z.unknown()]);
const Entries = z.array(Entry);

export function mapToJson<K, V>(map: ReadonlyMap<K, V>) {
  return JSON.stringify([...map]);
}

export function jsonToMap<K, V>(text: string) {
  let entries: [K, V][] | null = null;
  try {
    const parsed: unknown = Entries.parse(JSON.parse(text));
    entries = parsed as [K, V][];
  } catch {}

  return new Map(entries);
}
