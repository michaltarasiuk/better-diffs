import {isDefined} from '@/utils/defined';

export function parseParams(input: string, delimiter: ';' | ',' = ';') {
  const parser =
    delimiter === ';'
      ? /(?:^|;)\s*([^=;\s]+)(\s*=\s*(?:"((?:[^"\\]|\\.)*)"|((?:[^;]|\\\;)+))?)?/g
      : /(?:^|,)\s*([^=,\s]+)(\s*=\s*(?:"((?:[^"\\]|\\.)*)"|((?:[^,]|\\\,)+))?)?/g;

  const params: [string, string | undefined][] = [];

  let match: RegExpExecArray | null;
  while ((match = parser.exec(input)) !== null) {
    const keyMatch = match[1];
    if (!isDefined(keyMatch)) continue;

    const key = keyMatch.trim();

    let value: string | undefined;
    if (match[2]) {
      value = (match[3] || match[4] || '').replace(/\\(.)/g, '$1').trim();
    }

    params.push([key, value]);
  }

  return params;
}

export function quote(value: string) {
  if (value.includes('"') || value.includes(';') || value.includes(' ')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}
