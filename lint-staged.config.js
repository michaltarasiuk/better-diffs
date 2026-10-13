/** @type {import('lint-staged').Configuration} */
const config = {
  '*.{js,ts,tsx}': 'eslint --fix',
  '*': 'prettier --ignore-unknown --write',
  '*.go': 'gofmt -w',
};

export default config;
