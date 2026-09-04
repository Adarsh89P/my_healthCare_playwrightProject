import { test as base, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { AppointmentPage } from '@pages/AppointmentPage';
import { registerActionRecovery } from '@core/base/BasePage';
import { aiConfig } from '@ai/config';
import { attachTriage } from '@ai/failure-triage/fixture';
import { attemptHeal } from '@ai/self-healing/healer';

/**
 * Every page object is exposed as a fixture so specs never call `new` and
 * never import a page class directly. Adding a page to a project means adding
 * one line here.
 */
export interface Pages {
  loginPage: LoginPage;
  appointmentPage: AppointmentPage;
}

interface AiFixtures {
  /** Auto-fixture wiring the optional AI layer. No-op unless AI_ENABLED. */
  aiLayer: void;
}

export const test = base.extend<Pages & AiFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  appointmentPage: async ({ page }, use) => {
    await use(new AppointmentPage(page));
  },

  /**
   * Installs locator healing before the test and triages the failure after it.
   *
   * Both halves are inert when AI is disabled, so a run with no API key makes
   * zero network calls and behaves identically to a framework without this
   * layer. Neither half can change the test's pass/fail verdict.
   */
  aiLayer: [
    async ({ page }, use, testInfo) => {
      if (aiConfig.healingEnabled) {
        registerActionRecovery(async (targetPage, failedSelector, intent) => {
          const healed = await attemptHeal(targetPage, {
            failedSelector,
            intent,
            testTitle: testInfo.title,
          });
          return healed?.locator;
        });
      }

      await use();

      registerActionRecovery(undefined);
      await attachTriage(page, testInfo);
    },
    { auto: true },
  ],
});

export { expect };
