import dedent from 'dedent';

export const INSTALL_COMMAND = dedent`
  BASE_URL='${process.env.BASE_URL}'
  curl -fsSL "$BASE_URL/install.sh" | sh
`;
