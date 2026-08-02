import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AppointmentPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    facilityDropdown = this.page.locator('#combo_facility');
    readmissionCheckbox = this.page.locator('#chk_hospotal_readmission');
    medicareRadio = this.page.locator('#radio_program_medicare');
    visitDateInput = this.page.locator('#txt_visit_date');
    commentInput = this.page.locator('#txt_comment');
    bookAppointmentButton = this.page.locator('button[type="submit"]');
    confirmationHeading = this.page.locator('#summary h2');
    confirmationFacility = this.page.locator('#facility');

    async navigateToAppointmentPage() {
        await expect(this.page).toHaveURL(/.*#appointment/);
    }

    async navigateToBookingConfirmationPage() {
        await expect(this.page).toHaveURL(/.*appointment\.php#summary/);
        await this.expectVisible(this.confirmationHeading);
    }

    /**
     * The visit date field is backed by a bootstrap datepicker that ignores
     * plain text entry, so the date must be selected via the calendar UI.
     * Only dates within the currently displayed month are supported.
     */
    private async selectVisitDate(date: Date) {
        await this.click(this.visitDateInput);
        const day = String(date.getDate());
        const dayCell = this.page.locator('.datepicker-days td.day:not(.old):not(.new)', {
            hasText: new RegExp(`^${day}$`),
        });
        await this.click(dayCell);
    }

    async bookAppointment(facility: string, date: Date = new Date()) {
        await this.selectDropdown(this.facilityDropdown, facility);
        await this.click(this.readmissionCheckbox);
        await this.click(this.medicareRadio);
        await this.selectVisitDate(date);
        await this.fill(this.commentInput, 'This is a comment for testing purposes.');
        await this.click(this.bookAppointmentButton);
    }

    async submitWithoutVisitDate(facility: string) {
        await this.selectDropdown(this.facilityDropdown, facility);
        await this.click(this.readmissionCheckbox);
        await this.click(this.medicareRadio);
        await this.fill(this.commentInput, 'This is a comment for testing purposes.');
        await this.click(this.bookAppointmentButton);
    }
}
