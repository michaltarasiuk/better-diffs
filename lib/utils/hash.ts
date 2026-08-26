export function getHash(location: Pick<URL, 'hash'> = window.location) {
  const hash = location.hash.slice(1);
  return hash.length > 0 ? decodeURIComponent(hash) : null;
}

export function setHash(value: string) {
  window.location.hash = encodeURIComponent(value);
}
