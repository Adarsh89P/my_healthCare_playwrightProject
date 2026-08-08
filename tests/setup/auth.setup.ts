import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
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
  const loginPage = new LoginPage(page);

  await page.goto('/');
  await loginPage.login(config.user);

  // Landing on the appointment page is the app's signal that login succeeded.
  await expect(page).toHaveURL(/.*#appointment/);

  await page.context().storageState({ path: STORAGE_STATE });
  logger.info(`Saved authenticated storage state to ${STORAGE_STATE}`);
});
