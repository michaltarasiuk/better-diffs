import dedent from 'dedent';

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

export const DIFFS_CODE_BOTTOM_PADDING_UNSAFE_CSS = dedent`
  [data-code] {
    padding-bottom: 0;
  }
`;

export const EMPTY_DIFF_ATTRIBUTE = 'data-empty-diff';

export const DIFFS_EMPTY_DIFF_UNSAFE_CSS = dedent`
  :host([${EMPTY_DIFF_ATTRIBUTE}]) [data-deletions-count],
  :host([${EMPTY_DIFF_ATTRIBUTE}]) [data-additions-count] {
    display: none;
  }
`;
