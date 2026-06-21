import {Page}  from '@playwright/test';

export class LoginPage {

constructor(private page: Page) {}

usernameInput = 'input[name="username"]';
passwordInput = 'input[name="password"]';
loginButton = 'button[type="submit"]';
hamburgermenuButton = 'a[id="menu-toggle"]';
homeloginButton = 'a[href="profile.php#login"]';

 async login(user: string, pass: string) {
        await this.page.click(this.hamburgermenuButton);
        await this.page.click(this.homeloginButton);
        await this.page.fill(this.usernameInput, user);
        await this.page.fill(this.passwordInput, pass);
        await this.page.click(this.loginButton);

}
}