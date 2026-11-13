import { defineConfig, devices } from '@playwright/test';

// Visual safety net for stylesheet work; separate from `npm run test:e2e`.
// Baselines depend on the machine's fonts and browser, so they are local and
// not committed. Generate them from a known-good version before changing CSS.
// A separate port lets this run while a local development server uses 8000.
const PORT = 8010;

export default defineConfig({
  testDir: './visual',
  testMatch: '**/*.spec.js',
  // Each state is independent, and one at a time a run takes about eight minutes.
  fullyParallel: true,
  outputDir: './test-results/visual',
  snapshotPathTemplate: '{testDir}/baseline/{arg}{ext}',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    // No tolerated pixels: a refactor that moves rules should change nothing.
    // threshold is how different one pixel's colour must be to count. 0.08 is the
    // lowest tried value with no false alarms: 0.04 and below flagged 17-33 images
    // on unchanged code (edge noise). It does miss small shade changes: darkening
    // the 2px eligible-green outline by 10% passed and by 20% failed. Measured in
    // Developer Documentation/03_Developer_Guides/Testing_and_Verification.md.
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0.08, animations: 'disabled', caret: 'hide' }
  },
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Removes timing from drags and previews, so images are repeatable.
    reducedMotion: 'reduce',
    trace: 'off', screenshot: 'off', video: 'off'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'],
    // Tall enough that the page never scrolls: scroll position varied with timing
    // and shifted whole images, which would raise false alarms.
    // VISUAL_WIDTH lets a computed-style capture reach the narrow-screen rules; the
    // screenshot baselines exist only at the default width.
    viewport: { width: Number(process.env.VISUAL_WIDTH) || 1440, height: 2600 } } }],
  webServer: {
    command: 'node scripts/e2e-server.js',
    env: { E2E_PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 20_000
  }
});
