import { test as base, expect } from '@playwright/test';
import { registerActionRecovery } from '@core/base/BasePage';
import { aiConfig } from '@ai/config';
import { attachTriage } from '@ai/failure-triage/fixture';
import { attemptHeal } from '@ai/self-healing/healer';

/**
 * Framework-level fixtures. Contains no knowledge of any application under
 * test, so every app in `src/apps/*` extends this same base rather than
 * re-implementing it.
 *
 * An app's own fixture file adds its page objects on top:
 *   export const test = baseTest.extend<MyPages>({ ... });
 */
interface AiFixtures {
  /** Auto-fixture wiring the optional AI layer. No-op unless AI_ENABLED. */
  aiLayer: void;
}

export const test = base.extend<AiFixtures>({
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
