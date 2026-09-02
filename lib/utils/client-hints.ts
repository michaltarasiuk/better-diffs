import 'server-only';

import {headers} from 'next/headers';
import {z} from 'zod';

export const ClientHintsSchema = z.object({
  viewportHeight: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .catch(undefined),
});

export type ClientHints = z.infer<typeof ClientHintsSchema>;

export async function loadClientHints() {
  const requestHeaders = await headers();

  return ClientHintsSchema.parse({
    viewportHeight: requestHeaders.get('sec-ch-viewport-height'),
  });
}
