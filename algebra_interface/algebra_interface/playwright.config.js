import { defineConfig, devices } from '@playwright/test';

// Browser tests use a real HTTP origin because the application loads ES modules
// and stores documents in IndexedDB. Each test receives an isolated context.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1200 } } }],
  webServer: {
    command: 'node scripts/e2e-server.js',
    url: 'http://127.0.0.1:8000/',
    // Never silently test an older project served on the same port.
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
