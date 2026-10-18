// Runs the real Worker locally (wrangler dev, local D1) and tests it through the browser and the API.
// Sign-in is simulated with the X-Dev-User header, which the app honours only on localhost (lib/identity).
import { defineConfig } from '@playwright/test';

const PORT = 8797;
export const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './specs',
  globalSetup: './global-setup.js',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  // CHROME_PATH lets a machine without Playwright's own browser use an installed Chromium.
  use: { baseURL: BASE, viewport: { width: 1280, height: 900 }, trace: 'retain-on-failure', launchOptions: { executablePath: process.env.CHROME_PATH || undefined } },
  webServer: {
    cwd: '../..',
    command: [
      'node tests/e2e/node_modules/wrangler/bin/wrangler.js dev',
      `--port ${PORT} --ip 127.0.0.1 --local-upstream localhost`,
      '--persist-to tests/e2e/.state',
      '--var LOCAL_DEV_NO_SIGNIN_EMAIL:damian.hickey@triodian.com',
      '--var NOTIFY_SENDING:off',
      `--var SITE_URL:${BASE}`,
      '--show-interactive-dev-session=false',
    ].join(' '),
    url: `${BASE}/`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
