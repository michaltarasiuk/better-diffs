/** @type {import('lint-staged').Configuration} */
const config = {
  '*': 'prettier --ignore-unknown --write',
  '*.rs': 'rustfmt --edition 2024',
};

export default config;
