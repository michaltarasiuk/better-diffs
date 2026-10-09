import {parsePatchFiles} from '@pierre/diffs';

/** Builds a git patch that changes one line in each named file. */
export function gitPatch(...names: string[]) {
  return names
    .map(
      (name) =>
        `diff --git a/${name} b/${name}\n` +
        `--- a/${name}\n` +
        `+++ b/${name}\n` +
        `@@ -1 +1 @@\n` +
        `-old\n` +
        `+new\n`,
    )
    .join('');
}

export function fileDiffs(...names: string[]) {
  const [patch] = parsePatchFiles(gitPatch(...names));
  return patch!.files;
}
