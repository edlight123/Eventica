import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

// ESLint 9 defaults to flat config. `eslint-config-next` is still published as
// an eslintrc-style shareable config, so FlatCompat translates it — the same
// bridge `create-next-app` generates. Rules themselves are unchanged from the
// previous .eslintrc.json ("next/core-web-vitals"), so this upgrade should not
// move any lint result.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'public/**',
      'mobile/**',
      'scripts/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Under ESLint 8 + .eslintrc this rule resolved to nothing and reported
      // zero findings; under flat config it resolves app routes and flags ~8
      // pre-existing `<a href="/tickets/…">` links as errors, which would fail
      // `next build`. Those may well deserve `<Link>`, but converting them is a
      // navigation behaviour change — not something a lint-runner upgrade
      // should smuggle in. Kept visible as a warning; see the audit notes.
      '@next/next/no-html-link-for-pages': 'warn',
    },
  },
]
