/** @type {import('lint-staged').Configuration} */
const config = {
  '*': ['eslint --fix --no-warn-ignored', 'prettier --ignore-unknown --write'],
  '*.go': 'gofmt -w',
};

export default config;
