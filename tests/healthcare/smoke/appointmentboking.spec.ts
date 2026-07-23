import { currentEnv, credentials } from '@apps/healthcare/config';
import users from '@apps/healthcare/testdata/user.json';
import { test } from '@apps/healthcare/fixtures/fixture';
import { logger } from '@core/utils/logger';

test('@smoke Appointment Booking', async ({ page, loginPage, appointmentPage }) => {

    await page.goto(currentEnv.baseUrl);

    await loginPage.login(
        credentials.customer.username,
        credentials.customer.password
    );

    await appointmentPage.navigateToAppointmentPage();
    await appointmentPage.bookAppointment(users.facility.Hongkong);
    await appointmentPage.navigateToBookingConfirmationPage();
    logger.info('Appointment booked successfully');
});
