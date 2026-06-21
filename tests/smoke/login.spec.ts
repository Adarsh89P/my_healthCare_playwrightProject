import { LoginPage } from '../../src/pages/loginPage';
import { currentenv } from '../../src/config/env';
import users from '../../src/testdata/user.json';
import { test } from '../../src/fixtures/baseFixture';

test('Login Test', async ({ page, loginPage }) => {

    await page.goto(currentenv);

    await loginPage.login(
      users.customers.custusername,
      users.customers.custpassword
    );
});