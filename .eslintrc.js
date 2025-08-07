module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended'
  ],
  plugins: [
    '@typescript-eslint'
  ],
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  rules: {
    // Basic TypeScript rules - more lenient for development
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off', // Allow any during development
    'no-unused-vars': 'off', // Handled by TypeScript rule
    
    // General code quality - relaxed
    'no-console': 'off', // We use console for CLI output
    'no-debugger': 'error',
    'no-empty': 'warn', // Allow empty blocks with warning
    'no-constant-condition': 'off', // Allow while(true) loops in CLI
    'semi': ['error', 'always'],
    
    // CLI specific rules
    'no-process-exit': 'off', // CLI needs to exit with codes
    'no-process-env': 'off' // We use environment variables
  },
  overrides: [
    // Test files can be less strict
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-empty': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '*.js'
  ]
};