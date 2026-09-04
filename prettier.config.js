/** @type {import("prettier").Config} */
const config = {
  bracketSpacing: false,
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './app/_globals.css',
};

export default config;
