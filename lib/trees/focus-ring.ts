import dedent from 'dedent';

/**
 * HeroUI `.focus-ring` for @pierre/trees items.
 *
 * Outward rings are clipped by virtualized scroll containers, so the same
 * ring-2 + ring-offset-background layers are drawn inset on ::before.
 * Transition runs on focus-in only; blur is instant.
 */
export const DIFF_TREE_FOCUS_RING_UNSAFE_CSS = dedent`
  [data-type="item"] {
    --diff-tree-ring-width: 2px;
    --diff-tree-ring-offset: var(--ring-offset-width, 2px);
    --diff-tree-ring-spread: calc(var(--diff-tree-ring-width) + var(--diff-tree-ring-offset));

    &::before {
      content: "";
      position: absolute;
      inset: 0;
      display: block;
      border-radius: var(--trees-border-radius);
      pointer-events: none;
      outline: none;
      box-shadow:
        inset 0 0 0 0 var(--focus),
        inset 0 0 0 0 var(--background);
    }

    &:is([data-item-focused="true"], :focus-visible) {
      outline: none;
      -webkit-tap-highlight-color: transparent;
      --truncate-marker-block-inset: var(--diff-tree-ring-spread);

      &::before {
        box-shadow:
          inset 0 0 0 var(--diff-tree-ring-width) var(--focus),
          inset 0 0 0 var(--diff-tree-ring-spread) var(--background);
        transition: box-shadow 150ms var(--ease-out, cubic-bezier(0, 0, 0.2, 1));
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-type="item"]:is([data-item-focused="true"], :focus-visible)::before {
      transition: none;
    }
  }
`;
