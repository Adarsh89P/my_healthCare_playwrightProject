import { test as base, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { AppointmentPage } from '@pages/AppointmentPage';

/**
 * Every page object is exposed as a fixture so specs never call `new` and
 * never import a page class directly. Adding a page to a project means adding
 * one line here.
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
