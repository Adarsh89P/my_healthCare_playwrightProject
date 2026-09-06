import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '@apps/healthcare/pages/LoginPage';
import { config } from '@core/config/env';
import { logger } from '@core/utils/logger';
import path from 'path';

/**
 * Authentication setup project.
 *
 * Runs once before the test projects that depend on it, logs in through the UI,
 * and saves the resulting browser state to disk. Every authenticated test then
 * starts already signed in, instead of repeating a four-step UI login.
 *
 * A spec that must run signed out opts back out with:
 *   test.use({ storageState: { cookies: [], origins: [] } });
 */
export const STORAGE_STATE = path.resolve(process.cwd(), 'playwright/.auth/user.json');

setup('authenticate as standard user', async ({ page }) => {
  // Reading the strict getter here is what enforces BASE_URL for browser runs.
  // playwright.config.ts deliberately uses the non-throwing `optionalBaseUrl`
  // so that `--project=unit` loads without it; this assertion is where the
  // requirement actually lives, and every browser project depends on setup.
  expect(config.baseUrl, 'BASE_URL must be set for browser tests').toBeTruthy();

  const loginPage = new LoginPage(page);

  await page.goto('/');
  await loginPage.login(config.user);

  // Landing on the appointment page is the app's signal that login succeeded.
  await expect(page).toHaveURL(/.*#appointment/);

  await page.context().storageState({ path: STORAGE_STATE });
  logger.info(`Saved authenticated storage state to ${STORAGE_STATE}`);
});
