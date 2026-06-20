import {Page}  from '@playwright/test';

export class LoginPage {

constructor(private page: Page) {}

usernameInput = 'input[name="username"]';
passwordInput = 'input[name="password"]';
loginButton = 'button[type="submit"]';

 async login(user: string, pass: string) {
        await this.page.fill(this.usernameInput, user);
        await this.page.fill(this.passwordInput, pass);
        await this.page.click(this.loginButton);

}
}