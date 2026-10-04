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

export const EMPTY_DIFF_ATTRIBUTE = 'data-empty-diff';

/**
 * @pierre/diffs always prints `-0 +0` for a diff without hunks and offers no
 * per-item option to drop it, so hide the counts on hosts flagged with
 * EMPTY_DIFF_ATTRIBUTE.
 */
export const DIFFS_EMPTY_DIFF_UNSAFE_CSS = dedent`
  :host([${EMPTY_DIFF_ATTRIBUTE}]) [data-deletions-count],
  :host([${EMPTY_DIFF_ATTRIBUTE}]) [data-additions-count] {
    display: none;
  }
`;
