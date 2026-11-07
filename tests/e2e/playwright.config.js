// Runs the real Worker locally (wrangler dev, local D1) and tests it through the browser and the API.
// Sign-in is simulated with the X-Dev-User header, which the app honours only on localhost (lib/identity).
import { defineConfig } from '@playwright/test';

const PORT = 8797;
export const BASE = `http://localhost:${PORT}`;
// The client deployment profile (task 0.2): the same Worker with the demo parts switched off, on its own port.
export const CLIENT_BASE = `http://localhost:${PORT + 100}`;

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
  webServer: [{
    cwd: '../..',
    command: [
      'node tests/e2e/node_modules/wrangler/bin/wrangler.js dev',
      `--port ${PORT} --ip 127.0.0.1 --local-upstream localhost`,
      '--persist-to tests/e2e/.state',
      '--var LOCAL_DEV_NO_SIGNIN_EMAIL:damian.hickey@triodian.com',
      '--var NOTIFY_SENDING:off',
      // A test-only demo account (password Tq7£2Wx*90), so the demo sign-in is on here as on the demo site, where
      // DEMO_LOGIN is a Worker secret (docs/demo-sign-in.md).
      `--var 'DEMO_LOGIN:[{"username":"trio_demo","email":"demo@triodian.com","hash":"pbkdf2-sha256$100000$A99MOzmBypmjVi3B4Q9fxQ$BQLXVqg6ctSNkJcQS99OlABRNWiGPWPhU42C51PE66g","anyCharAt":[3]}]'`,
      `--var SITE_URL:${BASE}`,
      '--show-interactive-dev-session=false',
    ].join(' '),
    url: `${BASE}/`,
    timeout: 120_000,
    reuseExistingServer: false,
  }, {
    cwd: '../..',
    command: [
      'node tests/e2e/node_modules/wrangler/bin/wrangler.js dev',
      `--port ${PORT + 100} --ip 127.0.0.1 --local-upstream localhost --inspector-port ${PORT + 1100}`,
      '--persist-to tests/e2e/.state-client',
      '--var LOCAL_DEV_NO_SIGNIN_EMAIL:damian.hickey@triodian.com',
      '--var NOTIFY_SENDING:off',
      '--var SUITE_DEMO:off',
      "--var DEMO_LOGIN:''",
      '--show-interactive-dev-session=false',
    ].join(' '),
    url: `${CLIENT_BASE}/login`,
    timeout: 120_000,
    reuseExistingServer: false,
  }],
});
