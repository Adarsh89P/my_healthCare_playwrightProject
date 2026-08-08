import { Locator, Page, expect, test } from '@playwright/test';
import { logger } from '@core/utils/logger';

type ClickOptions = Parameters<Locator['click']>[0];
type FillOptions = Parameters<Locator['fill']>[1];
type WaitForOptions = Parameters<Locator['waitFor']>[0];
type SelectOptionValues = Parameters<Locator['selectOption']>[0];

/**
 * Project-agnostic base for every page object.
 *
 * Each wrapper does three things a bare `locator.click()` does not:
 *   1. emits a named `test.step`, so the HTML/Allure report reads as a
 *      human-legible sequence rather than a wall of raw actions,
 *   2. logs the action, and
 *   3. forwards Playwright's own options through, so nothing is lost by
 *      going through the wrapper.
 *
 * Page objects are free to call Playwright directly when a wrapper adds
 * nothing - these are conveniences, not a mandated abstraction layer.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Human-readable name for a locator, used in step titles. */
  protected describe(locator: Locator): string {
    return locator.toString().replace(/^locator\(['"]?|['"]?\)$/g, '');
  }

  protected async step<T>(title: string, body: () => Promise<T>): Promise<T> {
    logger.debug(title);
    return test.step(title, body);
  }

  // ---------------------------------------------------------------- navigation

  /** Navigates to `url`; a relative path resolves against the configured baseURL. */
  async navigate(url = '/'): Promise<void> {
    await this.step(`Navigate to ${url}`, async () => {
      await this.page.goto(url);
    });
  }

  async reload(): Promise<void> {
    await this.step('Reload page', async () => {
      await this.page.reload();
    });
  }

  // ------------------------------------------------------------------- actions

  async click(locator: Locator, options?: ClickOptions): Promise<void> {
    await this.step(`Click ${this.describe(locator)}`, async () => {
      await locator.click(options);
    });
  }

  async doubleClick(locator: Locator, options?: ClickOptions): Promise<void> {
    await this.step(`Double-click ${this.describe(locator)}`, async () => {
      await locator.dblclick(options);
    });
  }

  async rightClick(locator: Locator, options?: ClickOptions): Promise<void> {
    await this.step(`Right-click ${this.describe(locator)}`, async () => {
      await locator.click({ ...options, button: 'right' });
    });
  }

  async fill(locator: Locator, text: string, options?: FillOptions): Promise<void> {
    await this.step(`Fill ${this.describe(locator)}`, async () => {
      await locator.fill(text, options);
    });
  }

  /** Types character by character - only needed for inputs that listen to key events. */
  async type(locator: Locator, text: string, delayMs = 50): Promise<void> {
    await this.step(`Type into ${this.describe(locator)}`, async () => {
      await locator.pressSequentially(text, { delay: delayMs });
    });
  }

  async selectDropdown(locator: Locator, value: SelectOptionValues): Promise<void> {
    await this.step(`Select option in ${this.describe(locator)}`, async () => {
      await locator.selectOption(value);
    });
  }

  async check(locator: Locator): Promise<void> {
    await this.step(`Check ${this.describe(locator)}`, async () => {
      await locator.check();
    });
  }

  async hover(locator: Locator): Promise<void> {
    await this.step(`Hover ${this.describe(locator)}`, async () => {
      await locator.hover();
    });
  }

  async uploadFile(locator: Locator, filePath: string | string[]): Promise<void> {
    await this.step(`Upload file to ${this.describe(locator)}`, async () => {
      await locator.setInputFiles(filePath);
    });
  }

  async scrollIntoView(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  // -------------------------------------------------------------------- reads

  async getText(locator: Locator): Promise<string> {
    return (await locator.textContent())?.trim() ?? '';
  }

  async getValue(locator: Locator): Promise<string> {
    return locator.inputValue();
  }

  /**
   * Retrying visibility check.
   *
   * Playwright's own `locator.isVisible()` is deliberately non-retrying - it
   * snapshots the DOM immediately and returns false for an element that is
   * merely still rendering, which is a classic source of flake. This waits up
   * to `timeout` before deciding.
   */
  async isVisible(locator: Locator, timeout = 5_000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async count(locator: Locator): Promise<number> {
    return locator.count();
  }

  // ----------------------------------------------------------------- waiting

  async waitForVisible(locator: Locator, options?: WaitForOptions): Promise<void> {
    await locator.waitFor({ state: 'visible', ...options });
  }

  async waitForHidden(locator: Locator, options?: WaitForOptions): Promise<void> {
    await locator.waitFor({ state: 'hidden', ...options });
  }

  /**
   * Waits for a loading indicator to appear and then disappear. Absent or
   * already-finished loaders are not an error - the spinner may simply have
   * come and gone faster than we could observe it.
   */
  async waitForLoader(locator: Locator, timeout = 30_000): Promise<void> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 2_000 });
      await locator.waitFor({ state: 'hidden', timeout });
    } catch {
      // No loader appeared, or it had already gone. Both are fine.
    }
  }

  // -------------------------------------------------------------- assertions

  async expectVisible(locator: Locator): Promise<void> {
    await this.step(`Expect ${this.describe(locator)} to be visible`, async () => {
      await expect(locator).toBeVisible();
    });
  }

  async expectHidden(locator: Locator): Promise<void> {
    await this.step(`Expect ${this.describe(locator)} to be hidden`, async () => {
      await expect(locator).toBeHidden();
    });
  }

  async expectText(locator: Locator, text: string | RegExp): Promise<void> {
    await this.step(`Expect ${this.describe(locator)} to have text "${text}"`, async () => {
      await expect(locator).toHaveText(text);
    });
  }

  async expectContainsText(locator: Locator, text: string | RegExp): Promise<void> {
    await this.step(`Expect ${this.describe(locator)} to contain "${text}"`, async () => {
      await expect(locator).toContainText(text);
    });
  }

  async expectValue(locator: Locator, value: string | RegExp): Promise<void> {
    await expect(locator).toHaveValue(value);
  }

  async expectUrl(url: string | RegExp): Promise<void> {
    await this.step(`Expect URL to match ${url}`, async () => {
      await expect(this.page).toHaveURL(url);
    });
  }

  async expectTitle(title: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(title);
  }

  // ------------------------------------------------------------------ capture

  /** Attaches a screenshot to the test report rather than dumping it to disk. */
  async attachScreenshot(name = 'screenshot'): Promise<void> {
    const buffer = await this.page.screenshot({ fullPage: true });
    await test.info().attach(name, { body: buffer, contentType: 'image/png' });
  }
}
