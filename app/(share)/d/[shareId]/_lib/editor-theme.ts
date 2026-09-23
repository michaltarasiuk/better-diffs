import {cn, typographyVariants} from '@heroui/styles';
import type {EditorThemeClasses} from 'lexical';

export const EDITOR_THEME = {
  heading: {
    h1: typographyVariants({type: 'h4'}).base(),
    h2: typographyVariants({type: 'h5'}).base(),
    h3: typographyVariants({type: 'h6'}).base(),
  },
  paragraph: typographyVariants({type: 'body-sm'}).base(),
  quote: cn('border-border text-muted border-s-4 ps-4 italic'),
  text: {
    bold: cn('font-semibold text-foreground'),
    italic: cn('italic'),
    underline: cn('underline'),
    strikethrough: cn('line-through'),
    underlineStrikethrough: cn('underline-strikethroug'),
  },
} satisfies EditorThemeClasses;
