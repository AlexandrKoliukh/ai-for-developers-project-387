import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report' }], ['list']]
    : [['list']],

  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'off',
  },

  projects: [
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.ts',
      use: {
        baseURL: 'http://localhost:8000',
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
    {
      name: 'e2e',
      testMatch: '**/e2e/**/*.spec.ts',
      use: {
        baseURL: 'http://localhost:5173',
        ...devices['Desktop Chrome'],
        headless: true,
        viewport: { width: 1280, height: 800 },
        actionTimeout: 10_000,
        navigationTimeout: 15_000,
      },
    },
  ],
});
