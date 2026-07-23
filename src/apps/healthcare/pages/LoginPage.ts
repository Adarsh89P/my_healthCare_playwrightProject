import { Page } from '@playwright/test';
import { BasePage } from '@core/pages/BasePage';

export class LoginPage extends BasePage {

    constructor(page: Page) {
        super(page);
    }

    usernameInput = this.page.locator('input[name="username"]');
    passwordInput = this.page.locator('input[name="password"]');
    loginButton = this.page.locator('button[type="submit"]');
    hamburgerMenuButton = this.page.locator('a[id="menu-toggle"]');
    homeLoginButton = this.page.locator('a[href="profile.php#login"]');

    async login(user: string, pass: string) {
        await this.click(this.hamburgerMenuButton);
        await this.click(this.homeLoginButton);
        await this.fill(this.usernameInput, user);
        await this.fill(this.passwordInput, pass);
        await this.click(this.loginButton);
    }
}
