import dedent from 'dedent';

/**
 * Added and removed files keep a single full-width column even when the
 * CodeView uses split style. Expose one-pane annotation width as half the
 * file minus the line-number column, matching a split content pane rather
 * than 50% of the already-guttered content area.
 */
export const DIFFS_SINGLE_COLUMN_ANNOTATION_UNSAFE_CSS = dedent`
  [data-diff-type="single"] {
    container-type: inline-size;
  }

  [data-diff-type="single"] [data-additions],
  [data-diff-type="single"] [data-deletions] {
    --diffs-single-annotation-width: min(
      100%,
      calc(50cqi - var(--diffs-column-number-width, 0px))
    );
  }

  [data-diff-type="single"] [data-additions] [data-annotation-content],
  [data-diff-type="single"] [data-deletions] [data-annotation-content] {
    width: var(--diffs-single-annotation-width);
  }
`;
