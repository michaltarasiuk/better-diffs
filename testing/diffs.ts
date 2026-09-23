import dedent from 'dedent';

export const UNIFIED_DIFF = dedent`
  diff --git a/file.txt b/file.txt
  index 0000001..0000002 100644
  --- a/file.txt
  +++ b/file.txt
  @@ -1,2 +1,2 @@
  -old line
  +new line
   context
`;
