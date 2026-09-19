import dedent from 'dedent';

export const DEMO_PATCH = dedent`
  diff --git a/share.sh b/share.sh
  --- a/share.sh
  +++ b/share.sh
  @@ -1 +1,4 @@
  -git diff
  +better-diffs
  +better-diffs --staged
  +better-diffs --base main -- src/
  +better-diffs --open
`;

export const NOT_FOUND_PATCH = dedent`
  diff --git a/share/link b/share/link
  deleted file mode 100644
  --- a/share/link
  +++ /dev/null
  @@ -1,3 +0,0 @@
  -404 Not Found
  -diff share not found or expired
  -better-diffs --open
`;
