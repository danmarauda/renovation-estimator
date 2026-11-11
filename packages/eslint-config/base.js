// This package depends on TypeScript 6 on purpose. typescript-eslint parses through the JavaScript compiler
// API, which TypeScript 7 does not ship, so linting uses 6 here while every package type-checks with 7.
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['.turbo/**', 'dist/**']),
  js.configs.recommended,
  tseslint.configs.recommended,
]);
