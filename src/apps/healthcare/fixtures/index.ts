import { test as base, expect } from '@core/fixtures/base';
import { LoginPage } from '../pages/LoginPage';
import { AppointmentPage } from '../pages/AppointmentPage';

/**
 * Healthcare (CURA demo) fixtures.
 *
 * Every page object is exposed as a fixture so specs never call `new` and
 * never import a page class directly. Adding a page means adding one line
 * here. The optional AI layer is inherited from the core base fixture.
 */
export interface Pages {
  loginPage: LoginPage;
  appointmentPage: AppointmentPage;
}

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  appointmentPage: async ({ page }, use) => {
    await use(new AppointmentPage(page));
  },
});

export { expect };
