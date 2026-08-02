import { LoginPage } from '../../src/pages/loginPage';
import { currentenv } from '../../src/config/env';
import users from '../../src/testdata/user.json';
import { test } from '../../src/fixtures/baseFixture';
import { AppointmentPage } from '../../src/pages/AppointmentPage';
import { logger } from '../../src/utils/logger';

test('@smoke Appointment Booking', async ({ page, loginPage }) => {

    await page.goto(currentenv.baseUrl);

    await loginPage.login(
      users.customers.custusername,
      users.customers.custpassword
    );
    const appointmentPage = new AppointmentPage(page);
    await appointmentPage.navigateToAppointmentPage();
    await appointmentPage.bookAppointment(users.facility.Hongkong);
    await appointmentPage.navigateToBookingConfirmationPage();
    await appointmentPage.expectText(appointmentPage.confirmationFacility, users.facility.Hongkong);
    logger.info('Appointment booked successfully');
});