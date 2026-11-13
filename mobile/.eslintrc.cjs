// `text-xs` or an arbitrary size under 14 px, e.g. `text-[11px]`
const SMALL_TEXT = String.raw`/(^|\s)text-xs(\s|$)|text-\[(\d|1[0-3])(\.\d+)?px\]/`;

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'design'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    // Type scale: nothing under 14 px (see tailwind.config.ts and src/test/typeScale.test.ts)
    'no-restricted-syntax': [
      'error',
      {
        selector: `Literal[value=${SMALL_TEXT}]`,
        message: 'Text under 14 px is not allowed: use text-caption (14 px) or larger.',
      },
      {
        selector: `TemplateElement[value.raw=${SMALL_TEXT}]`,
        message: 'Text under 14 px is not allowed: use text-caption (14 px) or larger.',
      },
    ],
  },
};
