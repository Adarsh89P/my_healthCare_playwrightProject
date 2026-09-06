import { defineConfig, devices } from '@playwright/test';
import { BrowserName, config } from './src/core/config/env';

const STORAGE_STATE = 'playwright/.auth/user.json';

/**
 * Which application to run. Selects both the test directory (`tests/<app>`)
 * and, by convention, the page objects under `src/apps/<app>`. Adding a new
 * application means adding those two directories - not editing this file.
 */
const APP = process.env['APP'] ?? 'healthcare';

/** Unit tests live outside the browser projects entirely. */
const UNIT_TESTS = '**/tests/unit/**';

/**
 * Options that only mean something to a project that opens a browser.
 *
 * `baseURL` is read through `optionalBaseUrl`, which returns undefined rather
 * than throwing, so loading this file never demands a URL. A run that actually
 * needs one hits the assertion in tests/healthcare/setup/auth.setup.ts, which
 * every browser project depends on.
 */
const BROWSER_USE = {
  baseURL: config.optionalBaseUrl,
  headless: !config.headed,

  actionTimeout: config.timeouts.action,
  navigationTimeout: config.timeouts.navigation,

  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
} as const;

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
  testDir: `./tests/${APP}`,

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

  /* NOTE: there is deliberately no top-level `use` block.
     Playwright evaluates the whole config eagerly - every project's options,
     whichever project you actually selected - so a browser setting here is a
     setting the `unit` project is forced to satisfy too. That is how
     `--project=unit` came to require BASE_URL despite never opening a page.
     Browser-only options live in BROWSER_USE below. */

  projects: [
    /* Pure unit tests for the AI layer's parsing and fallback logic.
       No browser, no auth, no network - runs in milliseconds. */
    {
      name: 'unit',
      testDir: './tests/unit',
      /* Empty on purpose: no browser, no baseURL, no credentials. This project
         must run on a fresh clone with no .env file and no variables set. */
      use: {},
    },

    /* Logs in once and writes playwright/.auth/user.json. Every browser
       project depends on it, so tests start already authenticated. */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      testIgnore: UNIT_TESTS,
      use: BROWSER_USE,
    },

    /* Browser projects are generated from BROWSERS (chromium-only locally,
       all three in CI) so a project can pick its own coverage without
       editing this file. */
    ...config.browsers.map((browser) => ({
      name: browser,
      use: { ...BROWSER_USE, ...devices[DEVICE_FOR[browser]], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: [/.*\.setup\.ts/, UNIT_TESTS],
    })),
  ],
});
