import { test, expect } from '@fixtures/index';
import { ALL_FACILITIES, FACILITIES } from '@data/facilities';
import { HealthcareProgram } from '@pages/AppointmentPage';

test.describe('Appointment booking - regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#appointment');
  });

  /* Data-driven: every facility should book identically. */
  for (const facility of ALL_FACILITIES) {
    test(
      `books an appointment at ${facility}`,
      { tag: ['@regression'] },
      async ({ appointmentPage }) => {
        const booked = await appointmentPage.bookAppointment({ facility });

        await appointmentPage.expectOnConfirmationPage();
        await appointmentPage.expectConfirmationMatches(booked);
      }
    );
  }

  /* Each selectable healthcare programme should be echoed back on the
     confirmation. 'None' is deliberately excluded - see the default test below. */
  const programs: HealthcareProgram[] = ['Medicare', 'Medicaid'];
  for (const program of programs) {
    test(
      `records the "${program}" healthcare programme`,
      { tag: ['@regression'] },
      async ({ appointmentPage }) => {
        const booked = await appointmentPage.bookAppointment({
          facility: FACILITIES.tokyo,
          program,
        });

        await appointmentPage.expectOnConfirmationPage();
        await appointmentPage.expectText(appointmentPage.confirmationProgram, booked.program);
      }
    );
  }

  test(
    'defaults to the Medicare programme when none is selected',
    { tag: ['@regression'] },
    async ({ appointmentPage }) => {
      // The Medicare radio ships pre-checked, so there is no way to submit the
      // form with no programme at all - the confirmation always reports one.
      await appointmentPage.bookAppointment({ facility: FACILITIES.tokyo, program: 'None' });

      await appointmentPage.expectOnConfirmationPage();
      await appointmentPage.expectText(appointmentPage.confirmationProgram, 'Medicare');
    }
  );

  test(
    'records an appointment without hospital readmission',
    { tag: ['@regression'] },
    async ({ appointmentPage }) => {
      const booked = await appointmentPage.bookAppointment({
        facility: FACILITIES.seoul,
        hospitalReadmission: false,
      });

      await appointmentPage.expectOnConfirmationPage();
      await appointmentPage.expectConfirmationMatches(booked);
    }
  );

  test(
    'blocks submission when the visit date is missing',
    { tag: ['@regression'] },
    async ({ page, appointmentPage }) => {
      await appointmentPage.fillAppointmentForm({ facility: FACILITIES.tokyo });
      await appointmentPage.submitForm();

      // Visit date is a required HTML5 input, so the browser blocks submission
      // and the app never reaches the booking confirmation page.
      await expect(page).toHaveURL(/.*#appointment/);
      expect(await appointmentPage.isVisitDateValid()).toBe(false);
    }
  );
});
