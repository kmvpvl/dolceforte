// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
const config = tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    tseslint.configs.stylistic,
    {
        rules: {"@typescript-eslint/no-explicit-any": "off"},
    },
    {
        ignores: ["__test__/", "**/*.test.*", "**/*.config.*"],
    },
)

export default config;