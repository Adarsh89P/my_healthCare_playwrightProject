import { test, expect } from '@apps/healthcare/fixtures/index';
import { config } from '@core/config/env';
import { MESSAGES } from '@apps/healthcare/testdata/facilities';

/**
 * Login runs signed out, so it opts out of the shared authenticated
 * storage state that every other suite relies on.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test(
    'signs in with valid credentials and lands on the appointment page',
    { tag: ['@smoke'] },
    async ({ loginPage, appointmentPage }) => {
      await loginPage.login(config.user);
      await appointmentPage.expectOnAppointmentPage();
    }
  );

  test(
    'rejects invalid credentials with an error message',
    { tag: ['@regression'] },
    async ({ loginPage }) => {
      await loginPage.login({ username: 'invalidUser', password: 'invalidPassword' });
      await loginPage.expectLoginFailed(MESSAGES.loginFailed);
    }
  );

  test(
    'does not authenticate when credentials are empty',
    { tag: ['@regression'] },
    async ({ page, loginPage }) => {
      await loginPage.openLoginForm();
      await loginPage.submitCredentials('', '');

      // Whether the app blocks this client-side or server-side, the one thing
      // that must never happen is reaching the authenticated area.
      await expect(page).not.toHaveURL(/.*#appointment/);
    }
  );
});
