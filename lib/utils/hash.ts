export function getHash(url: URL) {
  const hash = url.hash.slice(1);
  return hash.length > 0 ? decodeURIComponent(hash) : null;
}

export function setHash(value: string) {
  window.location.hash = encodeURIComponent(value);
}
