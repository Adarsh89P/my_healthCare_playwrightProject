import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/loginPage';

type Pages = {
    loginPage: LoginPage;
};

export const test = base.extend<Pages>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    }
});