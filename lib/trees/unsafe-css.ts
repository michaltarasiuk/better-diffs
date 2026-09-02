import dedent from 'dedent';

/**
 * The scroll box hides focus rings drawn outside the row. Paint the ring
 * inside on ::before so tree rows match HeroUI (2px ring, then a gap).
 */
export const TREES_FOCUS_RING_UNSAFE_CSS = dedent`
  [data-type="item"] {
    --trees-ring-width: 2px;
    --trees-ring-offset: var(--ring-offset-width, 2px);
    --trees-ring-spread: calc(var(--trees-ring-width) + var(--trees-ring-offset));

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
      --truncate-marker-block-inset: var(--trees-ring-spread);

      &::before {
        box-shadow:
          inset 0 0 0 var(--trees-ring-width) var(--focus),
          inset 0 0 0 var(--trees-ring-spread) var(--background);
      }
    }
  }
`;
