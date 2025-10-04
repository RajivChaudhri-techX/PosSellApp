module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/e2e/init.js'],
  testTimeout: 120000,
  reporters: ['detox/runners/jest/streamlineReporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testEnvironment: 'detox/runners/jest/testEnvironment',
};