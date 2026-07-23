import { Page } from '@playwright/test';
import { BasePage } from '@core/pages/BasePage';

export class ExamplePage extends BasePage {

    constructor(page: Page) {
        super(page);
    }

    // Define your locators here, e.g.:
    // usernameInput = this.page.locator('#username');

    async doSomething() {
        // Use the inherited BasePage helpers: this.click(), this.fill(), this.expectVisible(), etc.
    }
}
