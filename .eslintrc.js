module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    env: {
        node: true,
        browser: false,
        commonjs: true,
    },
    settings: {},
    extends: [
        'plugin:@typescript-eslint/recommended',
        'eslint:recommended',
        // 'prettier',
        // 'plugin:prettier/recommended',
    ],
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        'newline-per-chained-call': ['error', { ignoreChainWithDepth: 2 }],
        indent: ['error', 4, { SwitchCase: 1 }],
    },
};
