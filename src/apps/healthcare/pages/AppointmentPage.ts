import { Page } from '@playwright/test';
import { BasePage } from '@core/pages/BasePage';

export class AppointmentPage extends BasePage {

    constructor(page: Page) {
        super(page);
    }

    facilityDropdown = this.page.locator('select[id="combo_facility"]');
    readmissionCheckbox = this.page.locator('input[id="chk_hospotal_readmission"]');
    healthcareProgramRadio = this.page.locator('input[name="programs"]').first();
    visitDateInput = this.page.locator('input[id="txt_visit_date"]');
    commentInput = this.page.locator('textarea[id="txt_comment"]');
    submitButton = this.page.locator('button[type="submit"]');

    private static getTodayDate(): string {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async navigateToAppointmentPage() {
        await this.expectUrl(/.*#appointment/);
    }

    async navigateToBookingConfirmationPage() {
        await this.expectUrl('https://katalon-demo-cura.herokuapp.com/#appointment');
    }

    async bookAppointment(facility: string, date: string = AppointmentPage.getTodayDate(), comment: string = 'This is a comment for testing purposes.') {
        await this.selectOption(this.facilityDropdown, facility);
        await this.check(this.readmissionCheckbox);
        await this.check(this.healthcareProgramRadio);
        await this.fill(this.visitDateInput, date);
        await this.fill(this.commentInput, comment);
        await this.click(this.submitButton);
    }
}
