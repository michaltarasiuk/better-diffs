import dedent from 'dedent';

import {env} from '@/env';

export const COMMAND = dedent`
  BASE_URL='${env.BASE_URL}'
  curl -fsSL "$BASE_URL/install.sh" | sh
`;
