/** @type {import('lint-staged').Configuration} */
const config = {
  '*': ['prettier --ignore-unknown --write', 'eslint --fix --no-warn-ignored'],
  '*.go': 'gofmt -w',
};

export default config;
