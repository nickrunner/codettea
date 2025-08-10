module.exports = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../coverage/packages/api',
  testMatch: ['**/?(*.)+(spec|test).[tj]s'],
};