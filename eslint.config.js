import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  { languageOptions: { globals: { console: 'readonly', process: 'readonly' } } },
  { files: ['tests/fixtures/*.js', 'tooling/check-package.mjs'], languageOptions: { globals: { window: 'readonly', document: 'readonly', fetch: 'readonly', setTimeout: 'readonly' } } },
);
