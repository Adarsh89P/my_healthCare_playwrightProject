import { defineConfig, devices } from '@playwright/test';
import { BrowserName, config } from './src/core/config/env';

const STORAGE_STATE = 'playwright/.auth/user.json';

const DEVICE_FOR: Record<BrowserName, string> = {
  chromium: 'Desktop Chrome',
  firefox: 'Desktop Firefox',
  webkit: 'Desktop Safari',
};

/**
 * Framework-level Playwright configuration.
 *
 * Everything environment-specific (URLs, credentials, timeouts) comes from
 * `config`, which reads .env.<TEST_ENV>. Pointing this framework at a different
 * application should never require editing this file.
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Per-test and per-assertion budgets, overridable via env vars. */
  timeout: config.timeouts.test,
  expect: { timeout: config.timeouts.expect },

  fullyParallel: true,

  /* Fail the build if a `test.only` was committed. */
  forbidOnly: config.isCI,

  retries: config.isCI ? 2 : 0,

  /* Use the runner's cores in CI too; sharding in the workflow splits the load
     further across machines. */
  workers: config.isCI ? '50%' : undefined,

  /* `blob` in CI so shards can be merged into one report afterwards. */
  reporter: config.isCI
    ? [['blob'], ['github'], ['allure-playwright'], ['list']]
    : [['html', { open: 'never' }], ['allure-playwright'], ['list']],

  use: {
    baseURL: config.baseUrl,
    headless: !config.headed,

    actionTimeout: config.timeouts.action,
    navigationTimeout: config.timeouts.navigation,

    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    /* Logs in once and writes playwright/.auth/user.json. Every browser
       project depends on it, so tests start already authenticated. */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    /* Browser projects are generated from BROWSERS (chromium-only locally,
       all three in CI) so a project can pick its own coverage without
       editing this file. */
    ...config.browsers.map((browser) => ({
      name: browser,
      use: { ...devices[DEVICE_FOR[browser]], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    })),
  ],
});
