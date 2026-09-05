import { test } from '@apps/healthcare/fixtures/index';
import { FACILITIES } from '@apps/healthcare/testdata/facilities';
import { logger } from '@core/utils/logger';

/**
 * Golden-path booking. Runs pre-authenticated via the shared storage state, so
 * it starts on the appointment page instead of repeating a UI login.
 */
test.describe('Appointment booking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#appointment');
  });

  test(
    'books an appointment and confirms every submitted field',
    { tag: ['@smoke'] },
    async ({ appointmentPage }) => {
      await appointmentPage.expectOnAppointmentPage();

      const booked = await appointmentPage.bookAppointment({ facility: FACILITIES.hongKong });

      await appointmentPage.expectOnConfirmationPage();
      await appointmentPage.expectConfirmationMatches(booked);

      logger.info('Appointment booked successfully', { facility: booked.facility });
    }
  );
});
