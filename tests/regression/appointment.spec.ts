import { expect } from '@playwright/test';
import { currentenv } from '../../src/config/env';
import users from '../../src/testdata/user.json';
import { test } from '../../src/fixtures/baseFixture';
import { AppointmentPage } from '../../src/pages/AppointmentPage';
import { logger } from '../../src/utils/logger';

test('@regression Appointment booking with a different facility (Seoul)', async ({ page, loginPage }) => {

    await page.goto(currentenv.baseUrl);

    await loginPage.login(
      users.customers.custusername,
      users.customers.custpassword
    );
    const appointmentPage = new AppointmentPage(page);
    await appointmentPage.navigateToAppointmentPage();
    await appointmentPage.bookAppointment(users.facility.Seoul);
    await appointmentPage.navigateToBookingConfirmationPage();
    await appointmentPage.expectText(appointmentPage.confirmationFacility, users.facility.Seoul);
    logger.info('Appointment booked successfully for Seoul facility');
});

test('@regression Booking without required visit date shows validation error', async ({ page, loginPage }) => {

    await page.goto(currentenv.baseUrl);

    await loginPage.login(
      users.customers.custusername,
      users.customers.custpassword
    );
    const appointmentPage = new AppointmentPage(page);
    await appointmentPage.navigateToAppointmentPage();
    await appointmentPage.submitWithoutVisitDate(users.facility.Tokyo);

    // The visit date field is a required HTML5 input; the browser blocks
    // submission, so the app should never reach the booking confirmation page.
    await expect(page).toHaveURL(/.*#appointment/);
    const isValid = await appointmentPage.visitDateInput.evaluate(
      (el: HTMLInputElement) => el.checkValidity()
    );
    expect(isValid).toBe(false);
});
