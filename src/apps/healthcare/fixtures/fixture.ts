import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AppointmentPage } from '../pages/AppointmentPage';

type HealthcareFixtures = {
    loginPage: LoginPage;
    appointmentPage: AppointmentPage;
};

export const test = base.extend<HealthcareFixtures>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    appointmentPage: async ({ page }, use) => {
        await use(new AppointmentPage(page));
    },
});

export { expect } from '@playwright/test';
