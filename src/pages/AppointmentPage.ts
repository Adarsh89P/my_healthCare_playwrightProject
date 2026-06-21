import {Page, expect} from '@playwright/test';

export class AppointmentPage {
    constructor(private page: Page) {}


    selectfacility = 'select[id="combo_facility"]';
    passwordInput = 'input[name="password"]';
    readmissionCheckbox = 'input[id="chk_hospotal_readmission"]';
    healthcareProgramRadio = 'input[name="programs"]';
    visitDateInput = 'input[id="txt_visit_date"]';
    commentInput = 'textarea[id="txt_comment"]';

    async navigateToAppointmentPage() {
        await expect(this.page).toHaveURL(/.*#appointment/);
    }
      async navigateToBookingConfirmationPage() {
        await expect(this.page).toHaveURL('https://katalon-demo-cura.herokuapp.com/#appointment');
    }

    private static getTodayDate(): string {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async bookAppointment(facility: string, date: string = AppointmentPage.getTodayDate()) {
        await this.page.selectOption(this.selectfacility, facility);
        await this.page.check(this.readmissionCheckbox);
        await this.page.check(this.healthcareProgramRadio);
        await this.page.fill(this.visitDateInput, date);
        await this.page.fill(this.commentInput, 'This is a comment for testing purposes.');
         await this.page.click('button[type="submit"]');
    }
}