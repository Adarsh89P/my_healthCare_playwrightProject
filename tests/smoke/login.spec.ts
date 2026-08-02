import { LoginPage } from '../../src/pages/loginPage';
import { currentenv } from '../../src/config/env';
import users from '../../src/testdata/user.json';
import { test } from '../../src/fixtures/baseFixture';
import { AppointmentPage } from '../../src/pages/AppointmentPage';
import { expect } from '@playwright/test';

test('@smoke Login Test', async ({ page, loginPage }) => {

    await page.goto(currentenv.baseUrl);

    await loginPage.login(
      users.customers.custusername,
      users.customers.custpassword
    );
    const appointmentPage = new AppointmentPage(page);
    await appointmentPage.navigateToAppointmentPage();
});

test('@regression Login with invalid credentials shows an error', async ({ page, loginPage }) => {

    await page.goto(currentenv.baseUrl);

    await loginPage.login('invalidUser', 'invalidPassword');

    await expect(page).toHaveURL(/.*#login/);
    await loginPage.expectVisible(loginPage.loginErrorMessage);
    await loginPage.expectText(
      loginPage.loginErrorMessage,
      'Login failed! Please ensure the username and password are valid.'
    );
});