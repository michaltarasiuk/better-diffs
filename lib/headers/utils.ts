export interface HeaderValue {
  toString(): string;
}

export function parseParams(input: string, delimiter: ';' | ',' = ';') {
  /*
   * Splits on the delimiter and unquotes values like
   * `filename="the\\ filename.txt"`.
   */
  const parser =
    delimiter === ';'
      ? /(?:^|;)\s*([^=;\s]+)(\s*=\s*(?:"((?:[^"\\]|\\.)*)"|((?:[^;]|\\\;)+))?)?/g
      : /(?:^|,)\s*([^=,\s]+)(\s*=\s*(?:"((?:[^"\\]|\\.)*)"|((?:[^,]|\\\,)+))?)?/g;

  const params: [string, string | undefined][] = [];

  let match: RegExpExecArray | null;
  while ((match = parser.exec(input)) !== null) {
    const keyMatch = match[1];
    if (!keyMatch) continue;

    const key = keyMatch.trim();

    let value: string | undefined;
    if (match[2]) {
      value = (match[3] || match[4] || '').replace(/\\(.)/g, '$1').trim();
    }

    params.push([key, value]);
  }

  return params;
}

export function quote(value: string): string {
  if (value.includes('"') || value.includes(';') || value.includes(' ')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function isIterable<T>(value: unknown): value is Iterable<T> {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  return typeof (value as Iterable<T>)[Symbol.iterator] === 'function';
}
