import 'server-only';

import {z} from 'zod';

const ViewportHeightSchema = z.coerce.number().positive();

export function parseClientHints(headers: Headers) {
  const viewportHeight = ViewportHeightSchema.safeParse(
    headers.get('sec-ch-viewport-height'),
  );

  return {
    ...(viewportHeight.success && {viewportHeight: viewportHeight.data}),
  };
}
