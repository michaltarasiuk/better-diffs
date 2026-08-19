/** @pierre/trees uses a trailing slash for canonical directory paths (e.g. `src/`). */
export function isDirectoryPath(path: string) {
  return path.endsWith('/');
}
