const DIRECTORY_PATH_SUFFIX = '/';

export function isDirectoryPath(path: string) {
  return path.endsWith(DIRECTORY_PATH_SUFFIX);
}
