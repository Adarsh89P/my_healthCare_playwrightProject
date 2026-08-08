import { Page } from '@playwright/test';
import { BasePage } from '@core/base/BasePage';
import { formatDDMMYYYY, nearFutureDateInCurrentMonth } from '@core/utils/dates';

export type HealthcareProgram = 'Medicare' | 'Medicaid' | 'None';

export interface AppointmentDetails {
  facility: string;
  hospitalReadmission?: boolean;
  program?: HealthcareProgram;
  /** Defaults to a near-future date inside the current month. */
  visitDate?: Date;
  comment?: string;
}

export class AppointmentPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  readonly facilityDropdown = this.page.locator('#combo_facility');
  readonly readmissionCheckbox = this.page.locator('#chk_hospotal_readmission');
  readonly visitDateInput = this.page.locator('#txt_visit_date');
  readonly commentInput = this.page.locator('#txt_comment');
  readonly bookAppointmentButton = this.page.locator('button[type="submit"]');

  // Confirmation ("summary") page
  readonly confirmationHeading = this.page.locator('#summary h2');
  readonly confirmationFacility = this.page.locator('#facility');
  readonly confirmationReadmission = this.page.locator('#hospital_readmission');
  readonly confirmationProgram = this.page.locator('#program');
  readonly confirmationVisitDate = this.page.locator('#visit_date');
  readonly confirmationComment = this.page.locator('#comment');

  private programRadio(program: HealthcareProgram) {
    return this.page.locator(`#radio_program_${program.toLowerCase()}`);
  }

  async expectOnAppointmentPage(): Promise<void> {
    await this.expectUrl(/.*#appointment/);
    await this.waitForVisible(this.facilityDropdown);
  }

  async expectOnConfirmationPage(): Promise<void> {
    await this.expectUrl(/.*appointment\.php#summary/);
    await this.expectVisible(this.confirmationHeading);
  }

  /**
   * The visit date field is backed by a bootstrap datepicker that ignores plain
   * text entry, so the date must be chosen from the calendar UI. The widget
   * renders one month at a time and this only clicks days in the month on
   * screen - see `nearFutureDateInCurrentMonth` for picking a safe date.
   */
  private async selectVisitDate(date: Date): Promise<void> {
    await this.step(`Select visit date ${formatDDMMYYYY(date)}`, async () => {
      await this.visitDateInput.click();
      const dayCell = this.page.locator('.datepicker-days td.day:not(.old):not(.new)', {
        hasText: new RegExp(`^${date.getDate()}$`),
      });
      await dayCell.click();
    });
  }

  /**
   * Fills the appointment form without submitting it, so negative tests can
   * assert on client-side validation.
   */
  async fillAppointmentForm(details: AppointmentDetails): Promise<void> {
    const {
      facility,
      hospitalReadmission = true,
      program = 'Medicare',
      visitDate,
      comment = 'Booked by the automated regression suite.',
    } = details;

    await this.selectDropdown(this.facilityDropdown, facility);

    if (hospitalReadmission) {
      await this.click(this.readmissionCheckbox);
    }
    if (program !== 'None') {
      await this.click(this.programRadio(program));
    }
    if (visitDate) {
      await this.selectVisitDate(visitDate);
    }

    await this.fill(this.commentInput, comment);
  }

  async submitForm(): Promise<void> {
    await this.click(this.bookAppointmentButton);
  }

  /** Fills the form with a valid, in-month visit date and submits it. */
  async bookAppointment(details: AppointmentDetails): Promise<Required<AppointmentDetails>> {
    const resolved: Required<AppointmentDetails> = {
      facility: details.facility,
      hospitalReadmission: details.hospitalReadmission ?? true,
      program: details.program ?? 'Medicare',
      visitDate: details.visitDate ?? nearFutureDateInCurrentMonth(),
      comment: details.comment ?? 'Booked by the automated regression suite.',
    };

    await this.fillAppointmentForm(resolved);
    await this.submitForm();
    return resolved;
  }

  /**
   * Asserts every field on the confirmation page matches what was submitted.
   * Previously only the facility was checked, so a wrong date or programme
   * would have gone unnoticed.
   */
  async expectConfirmationMatches(details: Required<AppointmentDetails>): Promise<void> {
    await this.expectText(this.confirmationFacility, details.facility);
    await this.expectText(this.confirmationReadmission, details.hospitalReadmission ? 'Yes' : 'No');
    await this.expectText(this.confirmationProgram, details.program);
    await this.expectText(this.confirmationVisitDate, formatDDMMYYYY(details.visitDate));
    await this.expectText(this.confirmationComment, details.comment);
  }

  /** True when the browser's own HTML5 validation is blocking submission. */
  async isVisitDateValid(): Promise<boolean> {
    return this.visitDateInput.evaluate((el: HTMLInputElement) => el.checkValidity());
  }
}
