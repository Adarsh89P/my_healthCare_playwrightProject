import { Page } from '@playwright/test';
import { BasePage } from '@core/base/BasePage';
import { Credentials } from '@core/config/env';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  readonly hamburgerMenuButton = this.page.locator('#menu-toggle');
  readonly homeLoginLink = this.page.locator('a[href="profile.php#login"]');
  readonly usernameInput = this.page.locator('input[name="username"]');
  readonly passwordInput = this.page.locator('input[name="password"]');
  readonly loginButton = this.page.locator('button[type="submit"]');
  readonly loginErrorMessage = this.page.locator('#login p.text-danger');

  /** Opens the login form from the landing page's slide-out menu. */
  async openLoginForm(): Promise<void> {
    await this.click(this.hamburgerMenuButton);
    await this.click(this.homeLoginLink);
    await this.waitForVisible(this.usernameInput);
  }

  /** Fills and submits the login form. Assumes the form is already open. */
  async submitCredentials(username: string, password: string): Promise<void> {
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
  }

  /** Full login journey: landing page -> menu -> form -> submit. */
  async login(credentials: Credentials): Promise<void> {
    await this.openLoginForm();
    await this.submitCredentials(credentials.username, credentials.password);
  }

  async expectLoginFailed(message: string): Promise<void> {
    await this.expectUrl(/.*#login/);
    await this.expectText(this.loginErrorMessage, message);
  }
}
