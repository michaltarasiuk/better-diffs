import dedent from 'dedent';

/*
 * Split scroll uses a 4-column grid on the server. After hydrate, Pierre uses
 * two equal columns and the code moves. Always use the server grid. Update this
 * when you upgrade @pierre/diffs.
 */
export const DIFFS_SPLIT_SCROLL_LAYOUT_UNSAFE_CSS = dedent`
  [data-diff-type="split"][data-overflow="scroll"] {
    grid-auto-flow: dense;
    grid-template-columns: repeat(2, var(--diffs-code-grid));
    padding-block: var(--diffs-gap-block, var(--diffs-gap-fallback));

    & [data-code] {
      display: contents;
    }

    & [data-deletions] [data-gutter] {
      grid-column: 1;
    }

    & [data-deletions] [data-content] {
      border-right: 1px solid var(--diffs-bg);
      grid-column: 2;
    }

    & [data-additions] [data-gutter] {
      border-left: 1px solid var(--diffs-bg);
      grid-column: 3;
    }

    & [data-additions] [data-content] {
      grid-column: 4;
    }

    & [data-content] {
      overflow: clip;
    }
  }

  [data-diff] {
    --diffs-code-grid: var(--diffs-grid-number-column-width) minmax(0, 1fr);
  }
`;
