module.exports = {
  extends: [
    'eslint-config-ali/react',
    'eslint-config-ali/typescript',
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  parserOptions: {
    ecmaVersion: 2018, // specify the version of ECMAScript syntax you want to use: 2015 => (ES6)
    sourceType: 'module', // Allows for the use of imports
    ecmaFeatures: {
      jsx: true, // enable JSX
      impliedStrict: true, // enable global strict mode
    },
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    'arrow-body-style': 'off',
    'max-len': 'off',
    'no-nested-ternary': 'off',
    'jsx-first-prop-new-line': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [1, { argsIgnorePattern: '^_', varsIgnorePattern: '^ignored?$' }],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    'no-console': 'off',
    indent: 0,
  },
};
