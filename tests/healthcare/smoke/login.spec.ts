import { currentEnv, credentials } from '@apps/healthcare/config';
import users from '@apps/healthcare/testdata/user.json';
import { test } from '@apps/healthcare/fixtures/fixture';

test('@smoke Login Test', async ({ page, loginPage, appointmentPage }) => {

    await page.goto(currentEnv.baseUrl);

    await loginPage.login(
        credentials.customer.username,
        credentials.customer.password
    );

    await appointmentPage.navigateToAppointmentPage();
});
