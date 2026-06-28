import {Page}  from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {

constructor(page: Page) {
        super(page);
    }

usernameInput = this.page.locator('input[name="username"]');
passwordInput = this.page.locator('input[name="password"]');
loginButton = this.page.locator('button[type="submit"]');
hamburgermenuButton = this.page.locator('a[id="menu-toggle"]');
homeloginButton = this.page.locator('a[href="profile.php#login"]');

 async login(user: string, pass: string) {
        await this.click(this.hamburgermenuButton);
        await this.click(this.homeloginButton);
        await this.fill(this.usernameInput, user);
        await this.fill(this.passwordInput, pass);
        await this.click(this.loginButton);
}
}