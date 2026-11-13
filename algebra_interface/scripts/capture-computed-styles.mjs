// Records exact computed styles for every visual state, for comparison with
// scripts/compare-computed-styles.mjs. A script rather than environment variables
// typed by hand, because their syntax differs between Windows and other systems.
// Usage: npm run test:visual:capture -- <folder> [width]
// Anything after the width goes to Playwright, for example -g "term-selected".
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const [folder, width = '1440', ...playwrightArguments] = process.argv.slice(2);
if (!folder) {
  console.error('Usage: npm run test:visual:capture -- <folder> [width]');
  process.exit(2);
}
// Runs Playwright's own file directly: through a Windows shell, an argument with
// spaces in it would be split apart.
const result = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.visual.config.js', '--retries=2', ...playwrightArguments],
  {
    stdio: 'inherit',
    env: { ...process.env, VISUAL_STYLE_CAPTURE: resolve(folder), VISUAL_WIDTH: width }
  }
);
process.exit(result.status ?? 1);
