module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  // `manual` and `offline-app` are separate, untracked side projects that live
  // in this folder but are not part of the app. Linting them here produced ~198
  // errors that drowned out real ones and kept `npm run lint` permanently red.
  ignorePatterns: ['dist', '.eslintrc.cjs', 'manual', 'offline-app'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/prop-types': 'off',
  },
  overrides: [
    {
      files: ['src/context/*.jsx'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
    {
      files: ['public/push-handler.js'],
      env: {
        serviceworker: true,
      },
    },
  ],
}
